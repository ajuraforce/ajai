import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { NewPageLayout } from "@/components/ui/new-navigation";

export default function NotFound() {
  return (
    <NewPageLayout>
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">404 Page Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/">
              <a>
                <Button className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Go to Dashboard</span>
                </Button>
              </a>
            </Link>
          </CardContent>
        </Card>
      </div>
    </NewPageLayout>
  );
}
