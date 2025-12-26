import { NextResponse } from "next/server";
import { z } from "zod";
import net from "net";

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
      // Essayez d'abord une connexion TCP si un port est fourni (plus fiable que fetch pour "ping")
      if (port) {
        const timeout = 3000;
        const socket = new net.Socket();

        const connectPromise: Promise<{ success: boolean }> = new Promise((resolve) => {
          let resolved = false;
          const onSuccess = () => {
            if (resolved) return;
            resolved = true;
            socket.destroy();
            resolve({ success: true });
          };

          const onFail = () => {
            if (resolved) return;
            resolved = true;
            socket.destroy();
            resolve({ success: false });
          };

          socket.setTimeout(timeout, onFail);
          socket.once("error", onFail);
          socket.once("timeout", onFail);
          socket.connect(port, host, onSuccess);
        });

        const result = await connectPromise;
        const responseTime = Date.now() - startTime;

        return NextResponse.json({
          status: result.success ? "up" : "down",
          responseTime,
        });
      }

      // Si pas de port fourni, tenter un HEAD HTTP (utile pour vérifier un service web)
      const url = `http://${host}`;
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
