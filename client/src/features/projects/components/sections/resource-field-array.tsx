"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Globe, Lock, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectFormValues } from "../../schemas/project.schema";

export function ResourceFieldArray() {
  const { control, register, watch } = useFormContext<ProjectFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "resources",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary/80 font-bold uppercase tracking-wider text-[10px]">
          <Shield className="size-3" />
          <span>Initial Resources (Vault)</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 rounded-lg px-2 text-[10px] font-bold uppercase tracking-tight gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
          onClick={() => append({ title: "", type: "link", url: "", username: "", password: "", description: "" })}
        >
          <Plus className="size-3" />
          Add Item
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const type = watch(`resources.${index}.type`);

          return (
            <div 
              key={field.id} 
              className="group relative bg-muted/30 p-4 rounded-2xl border border-border/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-lg text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-3.5" />
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`resources.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold opacity-60 uppercase tracking-tight">Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-xl bg-background border-border/40">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="credential">Credential</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name={`resources.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold opacity-60 uppercase tracking-tight">Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. AWS Console" className="h-9 rounded-xl bg-background border-border/40" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(type === "link" || type === "credential") && (
                  <FormField
                    control={control}
                    name={`resources.${index}.url`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-[10px] font-bold opacity-60 uppercase tracking-tight">URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." className="h-9 rounded-xl bg-background border-border/40" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {type === "credential" && (
                  <>
                    <FormField
                      control={control}
                      name={`resources.${index}.username`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold opacity-60 uppercase tracking-tight">Username</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="User" className="h-9 rounded-xl bg-background border-border/40" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`resources.${index}.password`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold opacity-60 uppercase tracking-tight">Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Pass" className="h-9 rounded-xl bg-background border-border/40" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="py-8 text-center border border-dashed border-border/40 rounded-2xl bg-muted/10">
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">No initial resources added</p>
          </div>
        )}
      </div>
    </div>
  );
}
