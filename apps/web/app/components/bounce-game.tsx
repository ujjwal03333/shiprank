"use client";

import { useEffect, useRef } from "react";

const WIDTH = 300;
const HEIGHT = 200;
const PADDLE_WIDTH = 56;
const PADDLE_HEIGHT = 8;
const BALL_RADIUS = 6;

/** Minimal, monochrome ball-and-paddle canvas game — pure client-side, no scoring, no persistence. */
export function BounceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddleXRef = useRef(WIDTH / 2 - PADDLE_WIDTH / 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const canvasColor = styles.getPropertyValue("--color-surface-sunken").trim() || "#ece4d6";
    const ballColor = styles.getPropertyValue("--color-brand").trim() || "#c4622d";
    const paddleColor = styles.getPropertyValue("--color-ink-subtle").trim() || "#8f8676";

    let ball = { x: WIDTH / 2, y: 40, vx: 1.6, vy: 1.9 };
    let raf = 0;

    function resetBall() {
      ball = { x: WIDTH / 2, y: 40, vx: 1.6 * (Math.random() > 0.5 ? 1 : -1), vy: 1.9 };
    }

    function tick() {
      if (!ctx) return;
      const paddleX = paddleXRef.current;

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - BALL_RADIUS < 0 || ball.x + BALL_RADIUS > WIDTH) ball.vx *= -1;
      if (ball.y - BALL_RADIUS < 0) ball.vy *= -1;

      const paddleY = HEIGHT - 16;
      if (
        ball.y + BALL_RADIUS >= paddleY &&
        ball.y + BALL_RADIUS <= paddleY + PADDLE_HEIGHT + 4 &&
        ball.x >= paddleX &&
        ball.x <= paddleX + PADDLE_WIDTH &&
        ball.vy > 0
      ) {
        ball.vy *= -1;
        // add a little english based on where it hit the paddle
        const hitPos = (ball.x - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        ball.vx = 1.6 * hitPos + (Math.random() - 0.5) * 0.4;
      }

      if (ball.y - BALL_RADIUS > HEIGHT) resetBall();

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = canvasColor;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = ballColor;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = paddleColor;
      ctx.beginPath();
      ctx.roundRect(paddleX, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    }

    function updatePaddleFromClientX(clientX: number) {
      const rect = canvas!.getBoundingClientRect();
      const scale = WIDTH / rect.width;
      const x = (clientX - rect.left) * scale - PADDLE_WIDTH / 2;
      paddleXRef.current = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, x));
    }

    function handleMouseMove(e: MouseEvent) {
      updatePaddleFromClientX(e.clientX);
    }
    function handleTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) updatePaddleFromClientX(touch.clientX);
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="mx-auto rounded-lg border border-border"
      aria-label="A small bouncing-ball game to pass the time while your scan runs"
    />
  );
}
