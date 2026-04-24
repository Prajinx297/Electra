import type { OracleRequest, OracleResponse } from "../types";
import { parseOracleResponse } from "../utils/oracleParser";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const requestOracle = async (
  request: OracleRequest,
  token?: string
): Promise<OracleResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/oracle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error("Oracle request failed.");
  }

  const payload = (await response.json()) as { parsed?: OracleResponse; raw?: string };
  return payload.parsed ?? parseOracleResponse(payload.raw ?? "");
};
