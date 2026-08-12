"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StrategyBuilder } from "@/components/strategy-builder";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export default function NewStrategyPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Create Strategy"
        description="Configure a new algorithmic trading strategy"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/strategies">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <StrategyBuilder mode="create" />
    </div>
  );
}
