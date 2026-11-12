import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  building: boolean;
  releaseUrl: string | null;
  checkedAt: string;
}

/**
 * Self-contained update service — no external GitHub dependency.
 * This install is fully self-hosted; updates are applied manually by
 * rebuilding the Docker images or pulling from your own registry.
 */
@Injectable()
export class UpdateService {
  private readonly logger = new Logger(UpdateService.name);

  async checkForUpdate(): Promise<VersionInfo> {
    const currentVersion = (process.env.APP_VERSION ?? '').trim() || 'dev';
    return {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      building: false,
      releaseUrl: null,
      checkedAt: new Date().toISOString(),
    };
  }

  async applyUpdate(): Promise<{ status: string; message: string }> {
    throw new BadRequestException(
      'This install is self-hosted. Update by rebuilding the Docker images manually.',
    );
  }

  async getProgress(): Promise<{
    state: string;
    step?: string | null;
    error?: string | null;
  }> {
    return { state: 'unavailable' };
  }
}
