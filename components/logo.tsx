import type { SVGProps, ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 2000 2000"
      xmlSpace="preserve"
      className={cn("size-12 text-primary", className)}
      {...props}
    >
      <g id="XMLID_233_">
        <polygon
          id="XMLID_274_"
          className="fill-current"
          points="1334.96,763.09 1168.79,763.09 1028.18,1006.63 1123.13,1129.98 1228.25,947.92 1292.5,836.63 1510.27,763.09"
        />
        <polygon
          id="XMLID_279_"
          className="fill-current"
          points="1007.37,1042.67 1007.08,1043.18 859.33,787.27 1047.51,881.44 730.9,564.83 564.73,564.83 785.9,947.92 1007.08,1331 1090.62,1186.3"
        />
      </g>
    </svg>
  );
}

