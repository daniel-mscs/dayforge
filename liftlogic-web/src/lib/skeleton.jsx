import React from "react";

const shimmerStyle = {
  background: "linear-gradient(90deg, #151a24 25%, #1f2533 50%, #151a24 75%)",
  backgroundSize: "800px 100%",
  animation: "skeletonShimmer 1.4s infinite",
  borderRadius: 8,
};

export function SkeletonStyle() {
  return (
    <style>{`
      @keyframes skeletonShimmer {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }
    `}</style>
  );
}

export function SkeletonBox({
  width = "100%",
  height = 14,
  radius = 8,
  style = {},
}) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width,
        height,
        borderRadius: radius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: "#151a24",
        border: "1px solid #ffffff0d",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SkeletonRow({ gap = 8, children, style = {} }) {
  return (
    <div style={{ display: "flex", gap, alignItems: "center", ...style }}>
      {children}
    </div>
  );
}

export function SkeletonGrid({ cols = 3, gap = 10, children, style = {} }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Skeletons prontos por tela

export function SkeletonMacros() {
  return (
    <>
      <SkeletonStyle />
      {/* Resumo */}
      <SkeletonCard>
        <SkeletonRow>
          <SkeletonBox width={80} height={40} radius={6} />
          <SkeletonBox width={60} height={14} />
        </SkeletonRow>
        <SkeletonBox height={8} radius={99} />
        <SkeletonGrid cols={3}>
          <SkeletonBox height={36} radius={10} />
          <SkeletonBox height={36} radius={10} />
          <SkeletonBox height={36} radius={10} />
        </SkeletonGrid>
      </SkeletonCard>

      {/* Adicionar alimento */}
      <SkeletonCard>
        <SkeletonBox width="45%" height={11} />
        <SkeletonBox height={40} radius={10} />
        <SkeletonRow gap={8}>
          <SkeletonBox width={80} height={40} radius={8} />
          <SkeletonBox height={40} radius={8} style={{ flex: 1 }} />
          <SkeletonBox width={60} height={40} radius={8} />
        </SkeletonRow>
      </SkeletonCard>

      {/* Refeições */}
      <SkeletonCard>
        <SkeletonBox width="55%" height={11} />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <SkeletonBox width="40%" height={11} />
            <SkeletonBox height={44} radius={10} />
          </div>
        ))}
      </SkeletonCard>
    </>
  );
}

export function SkeletonTreino() {
  return (
    <>
      <SkeletonStyle />
      {/* Timer */}
      <SkeletonCard>
        <SkeletonBox
          width="50%"
          height={56}
          radius={10}
          style={{ margin: "0 auto" }}
        />
      </SkeletonCard>

      {/* Exercícios */}
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i}>
          <SkeletonRow>
            <SkeletonBox width={60} height={20} radius={6} />
            <SkeletonBox
              width={40}
              height={20}
              radius={6}
              style={{ marginLeft: "auto" }}
            />
          </SkeletonRow>
          <SkeletonBox width="70%" height={18} />
          <SkeletonRow gap={8}>
            <SkeletonBox width={50} height={32} radius={8} />
            <SkeletonBox width={50} height={32} radius={8} />
            <SkeletonBox width={50} height={32} radius={8} />
          </SkeletonRow>
        </SkeletonCard>
      ))}
    </>
  );
}

export function SkeletonAgua() {
  return (
    <>
      <SkeletonStyle />
      <SkeletonCard>
        <SkeletonRow style={{ justifyContent: "space-between" }}>
          <SkeletonBox width={80} height={40} radius={6} />
          <SkeletonBox width={60} height={20} />
        </SkeletonRow>
        <SkeletonBox height={8} radius={99} />
        <SkeletonBox width="40%" height={12} />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBox width="45%" height={11} />
        <SkeletonGrid cols={2} gap={8}>
          <SkeletonBox height={48} radius={10} />
          <SkeletonBox height={48} radius={10} />
          <SkeletonBox height={48} radius={10} />
          <SkeletonBox height={48} radius={10} />
        </SkeletonGrid>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBox width="40%" height={11} />
        <SkeletonBox height={140} radius={10} />
      </SkeletonCard>
    </>
  );
}

export function SkeletonPeso() {
  return (
    <>
      <SkeletonStyle />
      <SkeletonGrid cols={2} gap={10} style={{ marginBottom: 12 }}>
        <SkeletonBox height={80} radius={12} />
        <SkeletonBox height={80} radius={12} />
        <SkeletonBox height={80} radius={12} />
        <SkeletonBox height={80} radius={12} />
      </SkeletonGrid>

      <SkeletonCard>
        <SkeletonBox width="50%" height={11} />
        <SkeletonBox height={200} radius={10} />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBox width="45%" height={11} />
        <SkeletonBox height={40} radius={10} />
      </SkeletonCard>
    </>
  );
}

export function SkeletonSono() {
  return (
    <>
      <SkeletonStyle />
      <SkeletonGrid cols={3} gap={10} style={{ marginBottom: 12 }}>
        <SkeletonBox height={70} radius={12} />
        <SkeletonBox height={70} radius={12} />
        <SkeletonBox height={70} radius={12} />
      </SkeletonGrid>

      <SkeletonCard>
        <SkeletonBox width="50%" height={11} />
        <SkeletonBox height={120} radius={10} />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBox width="40%" height={11} />
        <SkeletonGrid cols={2} gap={10}>
          <SkeletonBox height={60} radius={10} />
          <SkeletonBox height={60} radius={10} />
        </SkeletonGrid>
        <SkeletonBox height={44} radius={10} />
      </SkeletonCard>
    </>
  );
}

export function SkeletonSupl() {
  return (
    <>
      <SkeletonStyle />
      <SkeletonCard>
        <SkeletonBox width="50%" height={11} />
        <SkeletonBox height={8} radius={99} />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonBox width="30%" height={11} />
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} gap={12}>
            <SkeletonBox width={32} height={32} radius={99} />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <SkeletonBox width="60%" height={13} />
              <SkeletonBox width="40%" height={11} />
            </div>
          </SkeletonRow>
        ))}
      </SkeletonCard>
    </>
  );
}
