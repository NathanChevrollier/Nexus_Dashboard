import { NextResponse } from "next/server";
import { z } from "zod";

const pingSchema = z.object({
  host: z.string(),
  port: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = pingSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { host, port } = validatedData.data;
    const startTime = Date.now();

    try {
      // Pour une vraie implémentation, utiliser un module de ping approprié
      // Ici, on simule un ping simple avec fetch ou un timeout
      const url = port ? `http://${host}:${port}` : `http://${host}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        status: "up",
        responseTime,
        statusCode: response.status,
      });
    } catch (error) {
      return NextResponse.json({
        status: "down",
        responseTime: Date.now() - startTime,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
