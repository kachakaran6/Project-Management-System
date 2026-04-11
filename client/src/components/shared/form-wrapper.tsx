"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  UseFormReturn,
  DefaultValues,
  SubmitHandler,
  FieldValues,
  Resolver,
} from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface FormWrapperProps<TValues extends FieldValues> {
  schema: z.ZodType<TValues>;
  defaultValues?: DefaultValues<TValues>;
  onSubmit: SubmitHandler<TValues>;
  children: (methods: UseFormReturn<TValues>) => React.ReactNode;
  className?: string;
  id?: string;
}

export function FormWrapper<TValues extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  id,
}: FormWrapperProps<TValues>) {
  const methods = useForm<TValues>({
    resolver: (
      zodResolver as unknown as (schema: z.ZodTypeAny) => Resolver<TValues>
    )(schema as z.ZodTypeAny),
    defaultValues,
  });

  return (
    <form
      id={id}
      onSubmit={methods.handleSubmit(onSubmit)}
      className={cn("space-y-4", className)}
    >
      {children(methods)}
    </form>
  );
}
