"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

const TabsContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
} | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue: string
    value?: string
    onValueChange?: (value: string) => void
}

export function Tabs({
    defaultValue,
    value,
    onValueChange,
    className,
    children,
    ...props
}: TabsProps) {
    const [stateValue, setStateValue] = React.useState(defaultValue)
    const currentValue = value ?? stateValue
    const handleValueChange = onValueChange ?? setStateValue

    return (
        <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
            <div className={cn("dir-ltr", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

export const TabsList = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsList.displayName = "TabsList"

export const TabsTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-background text-foreground shadow",
                className
            )}
            onClick={() => context?.onValueChange(value)}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

export const TabsContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value

    if (!isActive) return null

    return (
        <div
            ref={ref}
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
TabsContent.displayName = "TabsContent"
