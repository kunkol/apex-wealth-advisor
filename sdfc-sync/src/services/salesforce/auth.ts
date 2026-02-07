import axios, { AxiosError } from 'axios';
import { Config, saveTokens } from '../../config/index.js';
import { createLogger } from '../logger.js';

const logger = createLogger('salesforce:auth');

interface TokenResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

interface TokenError {
  error: string;
  error_description: string;
}

export interface AuthResult {
  accessToken: string;
  instanceUrl: string;
}

export async function clientCredentialsAuth(
  config: Config,
  debug: boolean = false
): Promise<AuthResult> {
  const tokenUrl = `${config.instanceUrl}/services/oauth2/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);

  if (debug) {
    logger.debug(`POST ${tokenUrl}`);
    logger.debug(`Request: grant_type=client_credentials, client_id=${config.clientId.substring(0, 20)}...`);
  }

  try {
    const response = await axios.post<TokenResponse>(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (debug) {
      logger.debug(`Response status: ${response.status}`);
      logger.debug(`Instance URL: ${response.data.instance_url}`);
    }

    const result: AuthResult = {
      accessToken: response.data.access_token,
      instanceUrl: response.data.instance_url,
    };

    // Save tokens (client credentials flow doesn't provide refresh token)
    const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    saveTokens(config, result.accessToken, undefined, expiry);

    // Update instance URL if it changed
    if (result.instanceUrl && result.instanceUrl !== config.instanceUrl) {
      config.instanceUrl = result.instanceUrl;
    }

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<TokenError>;
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        throw new Error(
          `Authentication failed: ${errorData.error} - ${errorData.error_description}`
        );
      }
    }
    throw error;
  }
}

export async function revokeToken(
  instanceUrl: string,
  accessToken: string,
  debug: boolean = false
): Promise<void> {
  const revokeUrl = `${instanceUrl}/services/oauth2/revoke`;

  const params = new URLSearchParams();
  params.append('token', accessToken);

  if (debug) {
    logger.debug(`POST ${revokeUrl}`);
  }

  try {
    await axios.post(revokeUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (debug) {
      logger.debug('Token revoked successfully');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // Salesforce returns 200 even for invalid tokens, but may return errors in some cases
      if (axiosError.response?.status !== 200) {
        throw new Error(`Failed to revoke token: ${axiosError.message}`);
      }
    }
    throw error;
  }
}
