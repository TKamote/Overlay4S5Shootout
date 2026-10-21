import Image from "next/image";

/** Shared PSGB logo + product name for login and hub. */
export function BrandHeader({ titleClassName = "text-2xl font-bold" }: { titleClassName?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Image
        src="/PSGB_TransparantLogo.PNG"
        alt="Overlay4S5 Shootout"
        width={90}
        height={90}
        className="h-[90px] w-[90px] rounded-full object-cover"
        priority
      />
      <h1 className={titleClassName}>Overlay4S5 Shootout</h1>
    </div>
  );
}
