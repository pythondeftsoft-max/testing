
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

interface MarketToggleSwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  onText?: string;
  offText?: string;
}

const MarketToggleSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  MarketToggleSwitchProps
>(({ className, onText = "On Market", offText = "Off Market", ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-8 w-32 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500",
      className
    )}
    {...props}
    ref={ref}
  >
    {/* Off Text - Left Side - Centered better in red area */}
    <span 
      className={cn(
        "absolute left-8 w-16 h-full text-[9px] font-medium transition-opacity duration-200 flex items-center justify-center",
        "data-[state=checked]:opacity-0 data-[state=unchecked]:opacity-100 text-white"
      )}
      data-state={props.checked ? "checked" : "unchecked"}
    >
      {offText}
    </span>
    
    {/* On Text - Right Side */}
    <span 
      className={cn(
        "absolute left-6 w-16 h-full text-[9px] font-medium transition-opacity duration-200 flex items-center justify-center",
        "data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-0 text-white"
      )}
      data-state={props.checked ? "checked" : "unchecked"}
    >
      {onText}
    </span>
    
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-24 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
MarketToggleSwitch.displayName = "MarketToggleSwitch"

export { MarketToggleSwitch }
