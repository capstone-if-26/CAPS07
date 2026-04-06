import { NextResponse } from "next/server";

export type SuccessResponse<T> = {
  status: true;
  message: string;
  data: T;
};

type FailedResponse = {
  status: false;
  message: string;
  error?: unknown;
};

export function buildSuccessResponse<T>(
  data: T,
  message = "Success",
  statusCode = 200
) {
  return NextResponse.json(
    {
      status: true,
      message,
      data,
    },
    { status: statusCode }
  );
}

export function buildFailedResponse(
  message = "Something went wrong",
  error: unknown = null,
  statusCode = 400
) {
  const body: FailedResponse = {
    status: false,
    message,
  };

  if (error) {
    body.error = error;
  }

  return NextResponse.json(body, { status: statusCode });
}