export type ReplayRenderRequest = {
  jobId: string;
  matchId: string;
};

export type ReplayRenderAgent = {
  renderReplay(request: ReplayRenderRequest): Promise<void>;
};

export class NotImplementedReplayRenderAgent implements ReplayRenderAgent {
  async renderReplay(_request: ReplayRenderRequest): Promise<void> {
    throw new Error("Replay rendering is not implemented yet.");
  }
}
