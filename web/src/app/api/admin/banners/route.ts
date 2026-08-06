import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function frameFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.layout !== undefined) {
    const allowed = ["studio", "fullbleed", "promo", "overlay", "cutouts"];
    data.layout = allowed.includes(String(body.layout))
      ? String(body.layout)
      : "studio";
  }
  if (body.bgColor !== undefined) {
    const c = String(body.bgColor);
    data.bgColor = /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#f0e8df";
  }
  if (body.panelColor !== undefined) {
    const c = String(body.panelColor);
    data.panelColor = /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#1a2744";
  }
  if (body.highlight !== undefined)
    data.highlight = body.highlight ? String(body.highlight) : null;
  if (body.promoText !== undefined)
    data.promoText = body.promoText ? String(body.promoText) : null;
  if (body.couponCode !== undefined)
    data.couponCode = body.couponCode
      ? String(body.couponCode).toUpperCase()
      : null;
  if (body.tagline !== undefined)
    data.tagline = body.tagline ? String(body.tagline) : null;
  if (body.bannerSize !== undefined) {
    const s = String(body.bannerSize);
    data.bannerSize = ["compact", "normal", "tall"].includes(s) ? s : "tall";
  }
  if (body.imageFit !== undefined) {
    data.imageFit = body.imageFit === "cover" ? "cover" : "contain";
  }
  if (body.focalX !== undefined) data.focalX = clamp(Number(body.focalX), 0, 100);
  if (body.focalY !== undefined) data.focalY = clamp(Number(body.focalY), 0, 100);
  if (body.imageZoom !== undefined)
    data.imageZoom = clamp(Number(body.imageZoom), 0.5, 3);
  if (body.overlay !== undefined)
    data.overlay = clamp(Number(body.overlay), 0, 0.7);
  if (body.textStyle !== undefined) {
    data.textStyle =
      body.textStyle && typeof body.textStyle === "object"
        ? body.textStyle
        : {};
  }
  if (body.cutoutImages !== undefined) {
    if (!Array.isArray(body.cutoutImages)) {
      data.cutoutImages = [];
    } else {
      data.cutoutImages = body.cutoutImages
        .map((item) => {
          if (typeof item === "string") {
            return { url: item, x: 50, y: 0, scale: 1 };
          }
          if (item && typeof item === "object" && "url" in item) {
            const o = item as Record<string, unknown>;
            return {
              url: String(o.url),
              x: clamp(Number(o.x ?? 50), 0, 100),
              y: clamp(Number(o.y ?? 0), 0, 45),
              scale: clamp(Number(o.scale ?? 1), 0.45, 1.8),
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 6);
    }
  }
  if (body.videoUrl !== undefined) {
    data.videoUrl = body.videoUrl ? String(body.videoUrl).trim() : null;
  }
  if (body.videoSeconds !== undefined) {
    if (body.videoSeconds === null || body.videoSeconds === "") {
      data.videoSeconds = null;
    } else {
      const n = Math.round(Number(body.videoSeconds));
      data.videoSeconds = Number.isFinite(n) ? clamp(n, 2, 60) : 8;
    }
  }
  if (body.videoPlaylist !== undefined) {
    if (!Array.isArray(body.videoPlaylist)) {
      data.videoPlaylist = [];
      data.videoUrl = null;
      data.videoSeconds = null;
    } else {
      const clips = body.videoPlaylist
        .map((item) => {
          if (typeof item === "string" && item.trim()) {
            return {
              url: item.trim(),
              seconds: 8,
              focalX: 50,
              focalY: 50,
              zoom: 1,
            };
          }
          if (item && typeof item === "object" && "url" in item) {
            const o = item as Record<string, unknown>;
            const url = String(o.url || "").trim();
            if (!url) return null;
            const sec = Math.round(Number(o.seconds ?? 8));
            const fx = Number(o.focalX);
            const fy = Number(o.focalY);
            const zm = Number(o.zoom);
            return {
              url,
              seconds: Number.isFinite(sec) ? clamp(sec, 2, 60) : 8,
              focalX: Number.isFinite(fx) ? clamp(fx, 0, 100) : 50,
              focalY: Number.isFinite(fy) ? clamp(fy, 0, 100) : 50,
              zoom: Number.isFinite(zm) ? clamp(zm, 0.5, 3) : 1,
              ...(o.cutout === true || /\/video-cutout-bank\//.test(url)
                ? { cutout: true }
                : {}),
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 3) as {
        url: string;
        seconds: number;
        focalX: number;
        focalY: number;
        zoom: number;
      }[];
      data.videoPlaylist = clips;
      data.videoUrl = clips[0]?.url ?? null;
      data.videoSeconds = clips[0]?.seconds ?? null;
    }
  }
  if (body.videoLayout !== undefined) {
    data.videoLayout = body.videoLayout === "pair" ? "pair" : "sequence";
  }
  return data;
}

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(banners);
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const count = await prisma.banner.count();
  const blank =
    body.blank === true ||
    (body.title === "" && body.imageUrl === "" && !body.ctaLabel);

  const playlist = Array.isArray(body.videoPlaylist)
    ? body.videoPlaylist
        .map((item: unknown) => {
          if (typeof item === "string" && item.trim()) {
            return {
              url: item.trim(),
              seconds: 8,
              focalX: 50,
              focalY: 50,
              zoom: 1,
            };
          }
          if (item && typeof item === "object" && "url" in item) {
            const o = item as Record<string, unknown>;
            const url = String(o.url || "").trim();
            if (!url) return null;
            const sec = Math.round(Number(o.seconds ?? 8));
            const fx = Number(o.focalX);
            const fy = Number(o.focalY);
            const zm = Number(o.zoom);
            return {
              url,
              seconds: Number.isFinite(sec) ? clamp(sec, 2, 60) : 8,
              focalX: Number.isFinite(fx) ? clamp(fx, 0, 100) : 50,
              focalY: Number.isFinite(fy) ? clamp(fy, 0, 100) : 50,
              zoom: Number.isFinite(zm) ? clamp(zm, 0.5, 3) : 1,
              ...(o.cutout === true || /\/video-cutout-bank\//.test(url)
                ? { cutout: true }
                : {}),
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const firstVideo = playlist[0] as { url: string; seconds: number } | undefined;

  const banner = await prisma.banner.create({
    data: {
      title: blank
        ? ""
        : body.title !== undefined
          ? String(body.title)
          : "Novo banner",
      subtitle: blank ? null : body.subtitle || null,
      ctaLabel: blank
        ? null
        : body.ctaLabel !== undefined
          ? body.ctaLabel || null
          : "Comprar agora",
      ctaHref: blank
        ? "/categoria/conjunto-legging"
        : body.ctaHref || "/categoria/conjunto-legging",
      imageUrl: blank
        ? ""
        : body.imageUrl !== undefined
          ? String(body.imageUrl)
          : "/brand/hero-photo-1.jpg",
      textAlign: body.textAlign || "left",
      overlay: typeof body.overlay === "number" ? clamp(body.overlay, 0, 0.7) : 0,
      layout: ["studio", "fullbleed", "promo", "overlay", "cutouts"].includes(
        body.layout
      )
        ? body.layout
        : "studio",
      bgColor:
        typeof body.bgColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.bgColor)
          ? body.bgColor
          : "#f0e8df",
      panelColor:
        typeof body.panelColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(body.panelColor)
          ? body.panelColor
          : blank
            ? "#ebe3d8"
            : "#1a2744",
      highlight: blank ? null : body.highlight || null,
      promoText: blank ? null : body.promoText || null,
      couponCode:
        blank || !body.couponCode
          ? null
          : String(body.couponCode).toUpperCase(),
      tagline: blank ? null : body.tagline || null,
      bannerSize: ["compact", "normal", "tall"].includes(body.bannerSize)
        ? body.bannerSize
        : "tall",
      imageFit: body.imageFit === "cover" ? "cover" : "contain",
      focalX: typeof body.focalX === "number" ? clamp(body.focalX, 0, 100) : 50,
      focalY: typeof body.focalY === "number" ? clamp(body.focalY, 0, 100) : 50,
      imageZoom:
        typeof body.imageZoom === "number" ? clamp(body.imageZoom, 0.5, 3) : 1,
      textStyle:
        body.textStyle && typeof body.textStyle === "object"
          ? body.textStyle
          : {},
      cutoutImages: [],
      videoUrl: firstVideo?.url ?? (body.videoUrl ? String(body.videoUrl).trim() : null),
      videoSeconds:
        firstVideo?.seconds ??
        (typeof body.videoSeconds === "number"
          ? clamp(Math.round(body.videoSeconds), 2, 60)
          : null),
      videoPlaylist: playlist,
      videoLayout: body.videoLayout === "pair" ? "pair" : "sequence",
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : count,
      active: blank ? false : body.active !== false,
    },
  });
  void writeAuditLog({
    category: "marketing",
    action: "create",
    summary: `Banner criado: ${banner.title || "(sem título)"}`,
    entityType: "Banner",
    entityId: banner.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json(banner);
}

export async function PATCH(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map((id: string, index: number) =>
        prisma.banner.update({ where: { id }, data: { sortOrder: index } })
      )
    );
    void writeAuditLog({
      category: "marketing",
      action: "update",
      summary: "Ordem dos banners atualizada",
      entityType: "Banner",
      detail: { order: body.order },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const banner = await prisma.banner.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
      ...(body.ctaLabel !== undefined ? { ctaLabel: body.ctaLabel } : {}),
      ...(body.ctaHref !== undefined ? { ctaHref: body.ctaHref } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.textAlign !== undefined ? { textAlign: body.textAlign } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
      ...frameFields(body),
    },
  });
  void writeAuditLog({
    category: "marketing",
    action: "update",
    summary: `Banner alterado: ${banner.title || banner.id}`,
    entityType: "Banner",
    entityId: banner.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json(banner);
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  await prisma.banner.delete({ where: { id } });
  void writeAuditLog({
    category: "marketing",
    action: "delete",
    summary: `Banner excluído`,
    entityType: "Banner",
    entityId: id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({ ok: true });
}
