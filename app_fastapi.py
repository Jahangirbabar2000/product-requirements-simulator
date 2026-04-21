"""
FastAPI Application for NeedGen Requirements Elicitation Pipeline

Modern, production-grade API with:
- Auto-generated OpenAPI docs
- Type safety with Pydantic
- Async background processing
- High performance (2-3x faster than Flask)
"""

import os
import json
import uuid
import asyncio
import re
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import yaml

# Load .env from project root so env vars are available even when terminal
# "python.terminal.useEnvFile" is disabled (backend loads .env itself)
_env_path = Path(__file__).resolve().parent / ".env"
try:
    load_dotenv(dotenv_path=_env_path)
except (PermissionError, OSError):
    pass  # Continue without .env (e.g. missing file or permission)

from src.llm.factory import create_llm_client
from src.pipeline.pipeline import RequirementsPipeline
from src.pipeline.pipeline_parallel import ParallelRequirementsPipeline
from src.utils.logger import configure_logging, get_logger
from src.utils.analytics import AnalyticsCollector
from src.utils.reproducibility import ReproducibilityTester

# Initialize FastAPI app
app = FastAPI(
    title="NeedGen API",
    description="AI-powered requirements elicitation based on the Elicitron methodology",
    version="2.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc
)

# CORS configuration - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job storage (use Redis in production)
jobs: Dict[str, dict] = {}
reproducibility_jobs: Dict[str, dict] = {}  # Separate storage for reproducibility tests
logger = get_logger(__name__)


# Pydantic models for request/response validation
class AnalyzeRequest(BaseModel):
    product: str = Field(..., min_length=1, description="Product name or idea")
    design_context: str = Field(..., min_length=1, description="Design context or usage scenario")
    n_agents: int = Field(default=4, ge=2, le=20, description="Number of agent personas to generate")
    pipeline_mode: str = Field(default="parallel", description="Pipeline execution mode: 'sequential' or 'parallel'")

    class Config:
        json_schema_extra = {
            "example": {
                "product": "camping tent",
                "design_context": "ultralight backpacking in alpine conditions",
                "n_agents": 1,
                "pipeline_mode": "parallel"
            }
        }


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class RunInput(BaseModel):
    product: str = ""
    design_context: str = ""
    n_agents: int = 0
    pipeline_mode: str = "parallel"


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[dict] = None
    error: Optional[str] = None
    intermediate_results: Optional[dict] = None
    run_input: Optional[RunInput] = None


class ResultsResponse(BaseModel):
    job_id: str
    status: str
    results: Optional[dict] = None
    run_input: Optional[RunInput] = None


class ReproducibilityRequest(BaseModel):
    product: str = Field(..., min_length=1, description="Product name or idea")
    design_context: str = Field(..., min_length=1, description="Design context or usage scenario")
    n_agents: int = Field(default=4, ge=2, le=20, description="Number of agent personas per iteration")
    n_iterations: int = Field(default=3, ge=2, le=10, description="Number of iterations to run")

    class Config:
        json_schema_extra = {
            "example": {
                "product": "camping tent",
                "design_context": "ultralight backpacking in alpine conditions",
                "n_agents": 3,
                "n_iterations": 3
            }
        }


class ReproducibilityStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[dict] = None
    error: Optional[str] = None
    results: Optional[dict] = None


def load_config(config_path: str = "config/settings.yaml") -> dict:
    """Load configuration from YAML file."""
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    return {}


def load_interview_questions(questions_path: str = "config/interview_questions.yaml") -> list:
    """Load interview questions from YAML file."""
    if os.path.exists(questions_path):
        with open(questions_path, 'r') as f:
            data = yaml.safe_load(f)
            return data.get('questions', [])
    return []


async def run_pipeline_async(job_id: str, product_idea: str, design_context: str, n_agents: int, pipeline_mode: str = "parallel"):
    """
    Run the requirements elicitation pipeline asynchronously.
    
    Args:
        job_id: Unique job identifier
        product_idea: Product name/idea
        design_context: Design context description
        n_agents: Number of agents to generate
        pipeline_mode: 'sequential' (default) or 'parallel' execution mode
    """
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = {
            "stage": "initializing",
            "message": f"Starting {pipeline_mode} pipeline..."
        }
        jobs[job_id]["pipeline_mode"] = pipeline_mode
        
        # Load configuration
        config = load_config()
        interview_questions = load_interview_questions()
        
        # Initialize analytics collector
        analytics = AnalyticsCollector()
        
        # Initialize LLM client using factory
        llm_client = create_llm_client(config, analytics, job_id)
        
        # ================================================================
        # PARALLEL MODE: Use the new ParallelRequirementsPipeline
        # ================================================================
        if pipeline_mode == "parallel":
            logger.info(f"Job {job_id}: Using PARALLEL pipeline mode")
            
            # Set initial progress for parallel mode
            jobs[job_id]["progress"] = {
                "stage": "generating_agents",
                "stage_number": 1,
                "total_stages": 4,
                "message": "Starting parallel pipeline...",
                "completed": False
            }
            
            # Initialize intermediate results storage (will be populated during execution)
            jobs[job_id]["intermediate_results"] = {
                "agents": [],
                "experiences": [],
                "interviews": [],
                "needs": []
            }
            
            pipeline = ParallelRequirementsPipeline(
                llm_client=llm_client,
                interview_questions=interview_questions,
                analytics_collector=analytics,
                max_concurrent_calls=0,  # Unlimited - no throttling
                rate_limit_delay=0.0     # No delay
            )
            
            # Progress callback to update job status during parallel execution
            def update_progress(progress_info):
                stage = progress_info.get("stage", "processing")
                message = progress_info.get("message", "Processing...")
                data = progress_info.get("data", {})
                
                # Update intermediate results if data is provided
                if data:
                    if "agents" in data:
                        jobs[job_id]["intermediate_results"]["agents"] = data["agents"]
                    if "experiences" in data:
                        jobs[job_id]["intermediate_results"]["experiences"] = data["experiences"]
                    if "interviews" in data:
                        jobs[job_id]["intermediate_results"]["interviews"] = data["interviews"]
                    if "needs" in data:
                        jobs[job_id]["intermediate_results"]["needs"] = data["needs"]
                
                # Map parallel pipeline stages to UI-friendly stages
                # In parallel mode, stages 2&3 happen together. Only "completed" means whole job done.
                stage_mapping = {
                    "agent_generation": (1, "generating_agents", "Generating user personas..."),
                    "agent_generation_complete": (1, "generating_agents", None),
                    "parallel_processing": (2, "simulating_experiences", None),
                    "parallel_complete": (3, "conducting_interviews", None),
                    "experience_simulation": (2, "simulating_experiences", None),
                    "experience": (2, "simulating_experiences", None),
                    "interview": (3, "conducting_interviews", None),
                    "agent_complete": (3, "conducting_interviews", None),
                    "need_extraction": (4, "extracting_needs", "Extracting latent needs..."),
                    "need_extraction_complete": (4, "extracting_needs", None),
                    "completed": (4, "completed", "Analysis complete!"),
                    "failed": (2, "simulating_experiences", None),
                }
                
                stage_info = stage_mapping.get(stage, (2, "processing", None))
                stage_num, stage_name, default_msg = stage_info
                # Only set completed=True when pipeline sends stage "completed" (full run done)
                is_job_complete = stage == "completed"
                
                jobs[job_id]["progress"] = {
                    "stage": stage_name,
                    "stage_number": stage_num,
                    "total_stages": 4,
                    "message": default_msg if default_msg else message,
                    "completed": is_job_complete
                }
            
            # Run the parallel pipeline with progress callback
            results = await asyncio.to_thread(
                pipeline.run,
                n_agents,
                design_context,
                product_idea,
                False,  # save_intermediate
                update_progress  # progress_callback
            )
            
            # Store intermediate results from parallel pipeline
            jobs[job_id]["intermediate_results"] = {
                "agents": results.get("agents", []),
                "experiences": results.get("experiences", []),
                "interviews": results.get("interviews", []),
                "needs": []
            }
            
            # Use synthesized needs for intermediate display (8-12 unique needs)
            aggregated = results.get("aggregated_needs", {})
            synthesized = aggregated.get("synthesized_needs", [])
            if synthesized:
                jobs[job_id]["intermediate_results"]["needs"] = synthesized
            else:
                # Fallback to raw if synthesis not available
                for extraction in results.get("need_extractions", []):
                    jobs[job_id]["intermediate_results"]["needs"].extend(extraction.get("needs", []))
            
            # Update job with results
            jobs[job_id]["status"] = results["metadata"].get("status", "completed")
            jobs[job_id]["results"] = results
            
            # Set final progress state - this triggers the frontend to show results
            jobs[job_id]["progress"] = {
                "stage": "completed",
                "stage_number": 4,
                "total_stages": 4,
                "message": "Analysis complete!",
                "completed": True
            }
            
            # Save results to file
            results_dir = Path("results")
            results_dir.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"pipeline_results_{timestamp}_parallel.json"
            results_path = results_dir / filename
            
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            jobs[job_id]["results_file"] = str(results_path)
            logger.info(f"Job {job_id}: Parallel pipeline completed")
            return
        
        # ================================================================
        # SEQUENTIAL MODE: Use the original RequirementsPipeline
        # ================================================================
        logger.info(f"Job {job_id}: Using SEQUENTIAL pipeline mode")
        
        # Create pipeline
        pipeline = RequirementsPipeline(
            llm_client=llm_client,
            interview_questions=interview_questions,
            analytics_collector=analytics
        )
        
        # Initialize intermediate results storage
        jobs[job_id]["intermediate_results"] = {
            "agents": [],
            "experiences": [],
            "interviews": [],
            "needs": []
        }
        
        # Update progress
        jobs[job_id]["progress"] = {
            "stage": "generating_agents",
            "stage_number": 1,
            "total_stages": 4,
            "message": f"Generating {n_agents} agent persona(s)..."
        }
        
        # Run pipeline stages
        logger.info(f"Job {job_id}: Running pipeline for '{product_idea}'")
        
        # Stage 1: Generate agents
        agents = await asyncio.to_thread(
            pipeline.agent_generator.generate_agents,
            n_agents,
            design_context
        )
        
        # Store intermediate results
        jobs[job_id]["intermediate_results"]["agents"] = agents
        jobs[job_id]["progress"] = {
            "stage": "generating_agents",
            "stage_number": 1,
            "total_stages": 4,
            "message": f"✓ Generated {len(agents)} agent persona(s)",
            "completed": True
        }
        
        # Stage 2: Simulate experiences
        jobs[job_id]["progress"] = {
            "stage": "simulating_experiences",
            "stage_number": 2,
            "total_stages": 4,
            "message": "Simulating user experiences..."
        }
        
        experiences = await asyncio.to_thread(
            pipeline.experience_simulator.simulate_multiple_experiences,
            agents,
            product_idea
        )
        
        # Store intermediate results
        jobs[job_id]["intermediate_results"]["experiences"] = experiences
        jobs[job_id]["progress"] = {
            "stage": "simulating_experiences",
            "stage_number": 2,
            "total_stages": 4,
            "message": f"✓ Simulated {len(experiences)} experience(s)",
            "completed": True
        }
        
        # Stage 3: Conduct interviews
        jobs[job_id]["progress"] = {
            "stage": "conducting_interviews",
            "stage_number": 3,
            "total_stages": 4,
            "message": "Conducting follow-up interviews..."
        }
        
        interviews = await asyncio.to_thread(
            pipeline.interviewer.conduct_multiple_interviews,
            experiences
        )
        
        # Store intermediate results
        jobs[job_id]["intermediate_results"]["interviews"] = interviews
        total_qa = sum(len(i.get("interview", [])) for i in interviews)
        jobs[job_id]["progress"] = {
            "stage": "conducting_interviews",
            "stage_number": 3,
            "total_stages": 4,
            "message": f"✓ Completed {len(interviews)} interview(s) ({total_qa} Q&A pairs)",
            "completed": True
        }
        
        # Stage 4: Extract needs
        jobs[job_id]["progress"] = {
            "stage": "extracting_needs",
            "stage_number": 4,
            "total_stages": 4,
            "message": "Extracting latent needs..."
        }
        
        need_extractions = await asyncio.to_thread(
            pipeline.need_extractor.extract_from_multiple_interviews,
            interviews
        )
        
        # Aggregate needs
        aggregated_needs = await asyncio.to_thread(
            pipeline.need_extractor.aggregate_needs,
            need_extractions
        )
        
        # Synthesize needs (deduplicate to 8-12 unique)
        synthesized_needs = await asyncio.to_thread(
            pipeline.need_extractor.synthesize_needs,
            aggregated_needs.get("all_needs", []),
            product_idea
        )
        
        # Update aggregated_needs with synthesized list
        aggregated_needs["synthesized_needs"] = synthesized_needs
        aggregated_needs["total_synthesized"] = len(synthesized_needs)
        
        # Use synthesized needs for intermediate display (8-12 unique needs)
        jobs[job_id]["intermediate_results"]["needs"] = synthesized_needs if synthesized_needs else aggregated_needs.get("all_needs", [])
        
        # Get analytics summary
        analytics_summary = analytics.get_summary()
        
        # Prepare results
        results = {
            "metadata": {
                "start_time": jobs[job_id]["start_time"],
                "end_time": datetime.now().isoformat(),
                "n_agents": n_agents,
                "design_context": design_context,
                "product": product_idea,
                "pipeline_version": "2.0.0",
                "status": "completed"
            },
            "agents": agents,
            "experiences": experiences,
            "interviews": interviews,
            "need_extractions": need_extractions,
            "aggregated_needs": aggregated_needs,
            "analytics": analytics_summary
        }
        
        # Save results
        results_dir = Path("results")
        results_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pipeline_results_{timestamp}.json"
        results_path = results_dir / filename
        
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Update job
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["results"] = results
        jobs[job_id]["results_file"] = str(results_path)
        
        logger.info(f"Job {job_id}: Pipeline completed successfully")
        
    except Exception as e:
        logger.error(f"Job {job_id}: Pipeline failed: {str(e)}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


# API Routes

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "NeedGen API",
        "version": "2.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.
    Used by Render.com for uptime monitoring and auto-restart.
    """
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "needgen-backend"
    }


@app.post("/api/analyze", response_model=JobResponse)
async def analyze(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Start a new requirements elicitation analysis.
    
    Returns a job_id for tracking progress.
    
    Pipeline modes:
    - 'sequential': Traditional stage-by-stage execution (default)
    - 'parallel': Hybrid parallel execution for faster processing
    """
    job_id = str(uuid.uuid4())
    
    # Validate pipeline mode
    pipeline_mode = request.pipeline_mode.lower()
    if pipeline_mode not in ["sequential", "parallel"]:
        pipeline_mode = "parallel"
    
    # Initialize job
    jobs[job_id] = {
        "status": "queued",
        "start_time": datetime.now().isoformat(),
        "product": request.product,
        "design_context": request.design_context,
        "n_agents": request.n_agents,
        "pipeline_mode": pipeline_mode
    }
    
    # Add background task
    background_tasks.add_task(
        run_pipeline_async,
        job_id,
        request.product,
        request.design_context,
        request.n_agents,
        pipeline_mode
    )
    
    logger.info(f"Created job {job_id} for product: {request.product} (mode: {pipeline_mode})")
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message=f"Analysis started ({pipeline_mode} mode). Use the job_id to check status."
    )


@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
async def get_status(job_id: str):
    """
    Get the status of an analysis job.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    run_input = None
    if job.get("product") is not None:
        run_input = RunInput(
            product=job.get("product", ""),
            design_context=job.get("design_context", ""),
            n_agents=job.get("n_agents", 0),
            pipeline_mode=job.get("pipeline_mode", "parallel")
        )
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        error=job.get("error"),
        intermediate_results=job.get("intermediate_results"),
        run_input=run_input
    )


@app.get("/api/results/{job_id}", response_model=ResultsResponse)
async def get_results(job_id: str):
    """
    Get the results of a completed analysis job.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] not in ("completed", "completed_with_errors"):
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job['status']}"
        )
    
    run_input = None
    if job.get("product") is not None:
        run_input = RunInput(
            product=job.get("product", ""),
            design_context=job.get("design_context", ""),
            n_agents=job.get("n_agents", 0),
            pipeline_mode=job.get("pipeline_mode", "parallel")
        )
    return ResultsResponse(
        job_id=job_id,
        status=job["status"],
        results=job.get("results"),
        run_input=run_input
    )


# ==================== Saved runs (past runs from results/ directory) ====================

RESULTS_DIR = Path("results")


@app.get("/api/runs")
async def list_saved_runs():
    """
    List saved pipeline runs (from results/*.json). Returns metadata for each run.
    """
    if not RESULTS_DIR.exists():
        return {"runs": []}
    runs = []
    for path in sorted(RESULTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            with open(path, "r") as f:
                data = json.load(f)
            meta = data.get("metadata", {})
            agg = data.get("aggregated_needs", {}) or {}
            if isinstance(agg.get("total_needs"), (int, float)):
                total_needs = int(agg["total_needs"])
            else:
                total_needs = sum(len(v) if isinstance(v, list) else 0 for v in (agg.get("categories") or {}).values())
            runs.append({
                "filename": path.name,
                "product": meta.get("product", ""),
                "design_context": meta.get("design_context", "")[:100] + ("..." if len(meta.get("design_context", "")) > 100 else ""),
                "n_agents": meta.get("n_agents", 0),
                "start_time": meta.get("start_time", ""),
                "duration_seconds": meta.get("duration_seconds", 0),
                "total_needs": total_needs,
                "mode": meta.get("mode", "parallel"),
            })
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Could not read run {path.name}: {e}")
            continue
    return {"runs": runs}


@app.get("/api/runs/{filename}")
async def get_saved_run(filename: str):
    """
    Get a single saved run by filename (e.g. pipeline_results_20260201_120000.json).
    """
    if ".." in filename or "/" in filename or "\\" in filename or not filename.endswith(".json") or not filename.startswith("pipeline_results_"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = RESULTS_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Run not found")
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        raise HTTPException(status_code=500, detail=f"Could not read run: {e}")


class EditRequest(BaseModel):
    type: str = Field(..., description="Type of item: 'agent', 'experience', 'interview', or 'need'")
    id: str = Field(..., description="ID of the item to edit")
    field: str = Field(..., description="Field name to edit")
    content: str = Field(..., description="New content value")


@app.post("/api/edit/{job_id}")
async def edit_item(job_id: str, edit_request: EditRequest):
    """
    Edit an item in the results (agent, experience, interview, or need).
    Updates are stored in the job results.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] not in ["completed", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot edit. Job status: {job['status']}")
    
    # Initialize edits if not exists
    if "edits" not in job:
        job["edits"] = {}
    
    # Store the edit
    edit_key = f"{edit_request.type}_{edit_request.id}_{edit_request.field}"
    job["edits"][edit_key] = {
        "type": edit_request.type,
        "id": edit_request.id,
        "field": edit_request.field,
        "content": edit_request.content,
        "timestamp": datetime.now().isoformat()
    }
    
    # Apply edit to results if available
    if job.get("results"):
        results = job["results"]
        
        if edit_request.type == "agent":
            agent_idx = int(edit_request.id)
            if agent_idx < len(results.get("agents", [])):
                if edit_request.field == "description":
                    agent_text = results["agents"][agent_idx]
                    results["agents"][agent_idx] = re.sub(
                        r"(\*\*Description\*\*:\s*)(.+?)(?:\n|$)",
                        f"\\1{edit_request.content}",
                        agent_text,
                        flags=re.DOTALL
                    )
        
        elif edit_request.type == "need":
            # Parse category and index from id (format: "category-index")
            parts = edit_request.id.split("-")
            if len(parts) >= 2:
                category = parts[0]
                need_idx = int(parts[1])
                if category in results.get("aggregated_needs", {}).get("categories", {}):
                    category_needs = results["aggregated_needs"]["categories"][category]
                    if need_idx < len(category_needs):
                        category_needs[need_idx][edit_request.field] = edit_request.content
    
    logger.info(f"Job {job_id}: Edited {edit_request.type} {edit_request.id} field {edit_request.field}")
    
    return {"status": "success", "message": "Edit saved successfully"}


@app.get("/api/jobs")
async def list_jobs():
    """
    List all jobs (for debugging/admin).
    """
    return {
        "total": len(jobs),
        "jobs": [
            {
                "job_id": job_id,
                "status": job["status"],
                "product": job.get("product"),
                "start_time": job.get("start_time")
            }
            for job_id, job in jobs.items()
        ]
    }


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """
    Delete a job from memory.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    del jobs[job_id]
    return {"message": f"Job {job_id} deleted"}


# ==================== Reproducibility Testing Endpoints ====================

async def run_reproducibility_test_async(
    job_id: str,
    product: str,
    design_context: str,
    n_agents: int,
    n_iterations: int
):
    """
    Background task to run reproducibility testing.
    """
    logger.info(f"Reproducibility job {job_id}: Starting test with {n_iterations} iterations")
    
    reproducibility_jobs[job_id]["status"] = "processing"
    reproducibility_jobs[job_id]["progress"] = {
        "iteration": 0,
        "total": n_iterations,
        "stage": "initializing",
        "stage_name": "Initializing",
        "current_agent": None,
        "total_agents": n_agents,
        "elapsed_seconds": 0,
        "eta_seconds": None,
        "message": "Initializing reproducibility test..."
    }
    
    try:
        # Load config
        config = load_config()
        interview_questions = load_interview_questions()
        
        # Initialize LLM client using factory
        llm_client = create_llm_client(config, job_id=f"repro-{job_id}")
        
        # Initialize reproducibility tester
        tester = ReproducibilityTester(llm_client, interview_questions)
        
        def update_progress(progress_data):
            reproducibility_jobs[job_id]["progress"] = {
                "iteration": progress_data.get("iteration", 0),
                "total": progress_data.get("total", n_iterations),
                "stage": progress_data.get("stage", "processing"),
                "stage_name": progress_data.get("stage_name", "Processing..."),
                "current_agent": progress_data.get("current_agent"),
                "total_agents": progress_data.get("total_agents", n_agents),
                "elapsed_seconds": progress_data.get("elapsed_seconds", 0),
                "eta_seconds": progress_data.get("eta_seconds"),
                "message": progress_data.get("message", "Processing...")
            }
        
        # Run reproducibility test
        results = tester.run_iterations(
            n_iterations=n_iterations,
            product=product,
            design_context=design_context,
            n_agents=n_agents,
            progress_callback=update_progress
        )
        
        # Update job with results
        reproducibility_jobs[job_id]["status"] = "completed"
        reproducibility_jobs[job_id]["results"] = results
        reproducibility_jobs[job_id]["progress"] = {
            "iteration": n_iterations,
            "total": n_iterations,
            "stage": "completed",
            "stage_name": "Completed",
            "current_agent": None,
            "total_agents": n_agents,
            "elapsed_seconds": results.get("metadata", {}).get("total_duration", 0),
            "eta_seconds": 0,
            "message": "Reproducibility test completed!"
        }
        
        logger.info(f"Reproducibility job {job_id}: Test completed successfully")
        
    except Exception as e:
        logger.error(f"Reproducibility job {job_id}: Test failed: {str(e)}")
        reproducibility_jobs[job_id]["status"] = "failed"
        reproducibility_jobs[job_id]["error"] = str(e)


@app.post("/api/reproducibility/test", response_model=JobResponse)
async def start_reproducibility_test(request: ReproducibilityRequest, background_tasks: BackgroundTasks):
    """
    Start a reproducibility test.
    
    This runs the pipeline multiple times with the same input and measures
    the consistency/reproducibility of the outputs.
    """
    job_id = str(uuid.uuid4())
    
    # Initialize job with progress field
    reproducibility_jobs[job_id] = {
        "status": "queued",
        "start_time": datetime.now().isoformat(),
        "product": request.product,
        "design_context": request.design_context,
        "n_agents": request.n_agents,
        "n_iterations": request.n_iterations,
        "progress": {
            "iteration": 0,
            "total": request.n_iterations,
            "stage": "queued",
            "stage_name": "Queued",
            "current_agent": None,
            "total_agents": request.n_agents,
            "elapsed_seconds": 0,
            "eta_seconds": None,
            "message": "Queued, waiting to start..."
        }
    }
    
    # Add background task
    background_tasks.add_task(
        run_reproducibility_test_async,
        job_id,
        request.product,
        request.design_context,
        request.n_agents,
        request.n_iterations
    )
    
    logger.info(f"Created reproducibility job {job_id} for product: {request.product}")
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message=f"Reproducibility test started with {request.n_iterations} iterations. Use the job_id to check status."
    )


@app.get("/api/reproducibility/status/{job_id}", response_model=ReproducibilityStatusResponse)
async def get_reproducibility_status(job_id: str):
    """
    Get the status of a reproducibility test job.
    """
    if job_id not in reproducibility_jobs:
        raise HTTPException(status_code=404, detail="Reproducibility job not found")
    
    job = reproducibility_jobs[job_id]
    
    return ReproducibilityStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        error=job.get("error"),
        results=job.get("results")
    )


@app.get("/api/reproducibility/results/{job_id}")
async def get_reproducibility_results(job_id: str):
    """
    Get the full results of a reproducibility test.
    """
    if job_id not in reproducibility_jobs:
        raise HTTPException(status_code=404, detail="Reproducibility job not found")
    
    job = reproducibility_jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Current status: {job['status']}")
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "results": job.get("results")
    }


@app.get("/api/reproducibility/jobs")
async def list_reproducibility_jobs():
    """
    List all reproducibility test jobs.
    """
    return {
        "total": len(reproducibility_jobs),
        "jobs": [
            {
                "job_id": job_id,
                "status": job["status"],
                "product": job.get("product"),
                "n_iterations": job.get("n_iterations"),
                "start_time": job.get("start_time")
            }
            for job_id, job in reproducibility_jobs.items()
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    # Configure logging
    configure_logging()
    
    # Run server
    uvicorn.run(
        "app_fastapi:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )
