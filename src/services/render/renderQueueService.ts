export type RenderJobStatus = "queued" | "active" | "completed" | "failed" | "cancelled";

export type RenderJob = {
  id: string;
  matchId: string;
  status: RenderJobStatus;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
  note?: string;
};

export class RenderQueueService {
  private readonly jobs: RenderJob[] = [];

  createJob(matchId: string, requestedBy: string): RenderJob {
    const now = new Date();
    const job: RenderJob = {
      id: `render-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      matchId,
      status: "queued",
      requestedBy,
      createdAt: now,
      updatedAt: now,
      note: "Waiting for the local Windows render agent foundation."
    };

    this.jobs.unshift(job);
    return job;
  }

  listJobs(limit = 10): RenderJob[] {
    return this.jobs.slice(0, limit);
  }

  latestJob(): RenderJob | undefined {
    return this.jobs[0];
  }

  cancelCurrentJob(): RenderJob | undefined {
    const job = this.jobs.find((candidate) => ["queued", "active"].includes(candidate.status));

    if (!job) {
      return undefined;
    }

    job.status = "cancelled";
    job.updatedAt = new Date();
    job.note = "Cancelled by owner before rendering started.";
    return job;
  }
}
