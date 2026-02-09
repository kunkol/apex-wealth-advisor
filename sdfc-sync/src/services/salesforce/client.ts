import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Config } from '../../config/index.js';
import { debug, error as logError } from '../logger.js';

const API_VERSION = 'v59.0';
const COMPONENT = 'salesforce:client';

export interface QueryResult<T> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

export interface SalesforceRecord {
  Id: string;
  attributes?: {
    type: string;
    url: string;
  };
  [key: string]: unknown;
}

export interface CreateResult {
  id: string;
  success: boolean;
  errors: Array<{ message: string; statusCode: string }>;
}

export interface DeletedRecordsResult {
  deletedRecords: Array<{
    id: string;
    deletedDate: string;
  }>;
  earliestDateAvailable: string;
  latestDateCovered: string;
}

export class SalesforceClient {
  private client: AxiosInstance;
  private config: Config;
  private debugMode: boolean;

  constructor(config: Config, debugMode: boolean = false) {
    this.config = config;
    this.debugMode = debugMode;

    if (!config.accessToken) {
      throw new Error('Not authenticated. Run auth login first.');
    }

    this.client = axios.create({
      baseURL: `${config.instanceUrl}/services/data/${API_VERSION}`,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for debug mode
    this.client.interceptors.request.use(
      (request: InternalAxiosRequestConfig) => {
        if (this.debugMode) {
          debug(COMPONENT, `${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
          if (request.data) {
            debug(COMPONENT, `Request body: ${JSON.stringify(request.data).substring(0, 500)}`);
          }
        }
        return request;
      },
      (err: AxiosError) => {
        logError(COMPONENT, `Request error: ${err.message}`);
        return Promise.reject(err);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (this.debugMode) {
          debug(COMPONENT, `Response status: ${response.status}`);
          const dataStr = JSON.stringify(response.data);
          if (dataStr.length > 500) {
            debug(COMPONENT, `Response body: ${dataStr.substring(0, 500)}... (truncated)`);
          } else {
            debug(COMPONENT, `Response body: ${dataStr}`);
          }
        }
        return response;
      },
      (err: AxiosError) => {
        if (this.debugMode && err.response) {
          logError(COMPONENT, `Response error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        }
        return Promise.reject(err);
      }
    );
  }

  async query<T extends SalesforceRecord>(soql: string): Promise<QueryResult<T>> {
    const response = await this.client.get<QueryResult<T>>('/query', {
      params: { q: soql },
    });
    return response.data;
  }

  async queryAll<T extends SalesforceRecord>(soql: string): Promise<T[]> {
    const results: T[] = [];
    let response = await this.query<T>(soql);
    results.push(...response.records);

    while (!response.done && response.nextRecordsUrl) {
      const nextResponse = await this.client.get<QueryResult<T>>(response.nextRecordsUrl);
      response = nextResponse.data;
      results.push(...response.records);
    }

    return results;
  }

  async create(objectType: string, data: Record<string, unknown>): Promise<CreateResult> {
    const response = await this.client.post<CreateResult>(`/sobjects/${objectType}`, data);
    return response.data;
  }

  async update(objectType: string, id: string, data: Record<string, unknown>): Promise<void> {
    await this.client.patch(`/sobjects/${objectType}/${id}`, data);
  }

  async delete(objectType: string, id: string): Promise<void> {
    await this.client.delete(`/sobjects/${objectType}/${id}`);
  }

  async get<T extends SalesforceRecord>(objectType: string, id: string, fields?: string[]): Promise<T> {
    let url = `/sobjects/${objectType}/${id}`;
    if (fields && fields.length > 0) {
      url += `?fields=${fields.join(',')}`;
    }
    const response = await this.client.get<T>(url);
    return response.data;
  }

  async describe(objectType: string): Promise<Record<string, unknown>> {
    const response = await this.client.get<Record<string, unknown>>(`/sobjects/${objectType}/describe`);
    return response.data;
  }

  async getOrganizationInfo(): Promise<SalesforceRecord> {
    const result = await this.query<SalesforceRecord>(
      'SELECT Id, Name, OrganizationType, IsSandbox FROM Organization LIMIT 1'
    );
    if (result.records.length === 0) {
      throw new Error('Unable to retrieve organization info');
    }
    return result.records[0];
  }

  getInstanceUrl(): string {
    return this.config.instanceUrl;
  }

  /**
   * Get deleted records for a given object type within a date range.
   * The start and end dates define the time window to check for deletions.
   * @param objectType - The Salesforce object type (e.g., 'Account', 'Contact')
   * @param startDate - Start of the date range
   * @param endDate - End of the date range
   * @returns List of deleted record IDs with their deletion dates
   */
  async getDeleted(objectType: string, startDate: Date, endDate: Date): Promise<DeletedRecordsResult> {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    const response = await this.client.get<DeletedRecordsResult>(
      `/sobjects/${objectType}/deleted/`,
      {
        params: { start, end },
      }
    );
    return response.data;
  }
}
