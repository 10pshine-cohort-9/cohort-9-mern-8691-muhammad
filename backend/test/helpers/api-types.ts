import { expect } from 'chai';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
}

export function assertSuccessResponse<T>(resBody: unknown): T {
  expect(resBody).to.be.an('object');
  const body = resBody as ApiSuccessResponse<T>;
  expect(body.success).to.equal(true);
  expect(body).to.have.property('data');
  return body.data;
}

export function assertErrorResponse(
  resBody: unknown,
  expectedStatusCode: number,
): ApiErrorResponse {
  expect(resBody).to.be.an('object');
  const body = resBody as ApiErrorResponse;
  expect(body.success).to.equal(false);
  expect(body.statusCode).to.equal(expectedStatusCode);
  expect(body.message).to.be.ok;
  return body;
}
