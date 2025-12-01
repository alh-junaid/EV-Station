import { useQuery } from "@tanstack/react-query";
import { Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
    const [, setLocation] = useLocation();
    const { data: user, isLoading } = useQuery({
        queryKey: ["/api/me"],
        retry: false,
    });

    if (isLoading) {
        return (
            <Route path={path}>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Route>
        );
    }

    if (!(user as any)?.user) {
        // Not logged in, redirect to login
        // We render a route that immediately redirects
        return (
            <Route path={path}>
                {() => {
                    setLocation("/login");
                    return null;
                }}
            </Route>
        );
    }

    // Logged in, render component
    return <Route path={path} component={Component} />;
}
