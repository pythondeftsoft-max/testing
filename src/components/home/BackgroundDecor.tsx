export default function BackgroundDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-openkey-blue/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-openkey-gold/20 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage:
          "radial-gradient(circle at 25px 25px, hsl(var(--border)) 1px, transparent 0)",
        backgroundSize: "50px 50px",
      }} />
    </div>
  );
}
