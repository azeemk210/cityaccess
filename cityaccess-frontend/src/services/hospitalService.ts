const API_BASE_URL = 'http://127.0.0.1:8000';

export interface Hospital {
  name: string;
  lon: number;
  lat: number;
  distance_m?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const hospitalService = {
  async getAllHospitals(): Promise<ApiResponse<Hospital[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  async getNearestHospitals(lon: number, lat: number, dist: number = 2000): Promise<ApiResponse<Hospital[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/nearest?lon=${lon}&lat=${lat}&dist=${dist}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  async testConnection(): Promise<ApiResponse<{ status: string; postgres_version: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/test-db`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }
};
