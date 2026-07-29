import handler from "vinext/server/app-router-entry";

const worker = {
  fetch(
    request: Request,
    environment: Cloudflare.Env,
    context: ExecutionContext,
  ): Promise<Response> {
    return handler.fetch(request, environment, context);
  },
};

export default worker;
