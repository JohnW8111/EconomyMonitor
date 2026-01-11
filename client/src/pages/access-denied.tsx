import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AccessDenied() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            Your email <span className="font-mono text-foreground">{user?.email || 'unknown'}</span> is not on the approved access list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Please contact the administrator if you believe you should have access.
          </p>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => logout()}
            data-testid="button-logout"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
