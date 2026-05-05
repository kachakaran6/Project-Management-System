
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
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="size-4" />
          <span>Initial Resources (Vault)</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-md px-3 text-[11px] font-medium transition-all gap-1.5"
          onClick={() => append({ title: "", type: "link", url: "", username: "", password: "", description: "" })}
        >
          <Plus className="size-3.5" />
          Add Item
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const type = watch(`resources.${index}.type`);

          return (
            <div 
              key={field.id} 
              className="group relative bg-muted/30 p-5 rounded-lg border border-border/50 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <button
                type="button"
                className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`resources.${index}.type`}
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 rounded-md bg-background border-border shadow-sm text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg">
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
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. AWS Console" className="h-9 rounded-md bg-background border-border shadow-sm text-[13px]" />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
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
                      <FormItem className="sm:col-span-2 space-y-1.5">
                        <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." className="h-9 rounded-md bg-background border-border shadow-sm text-[13px]" />
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
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Username</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="User" className="h-9 rounded-md bg-background border-border shadow-sm text-[13px]" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`resources.${index}.password`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Pass" className="h-9 rounded-md bg-background border-border shadow-sm text-[13px]" />
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
          <div className="py-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
            <p className="text-[12px] font-medium text-muted-foreground/60 italic tracking-normal">No initial resources added</p>
          </div>
        )}
      </div>
    </div>
  );
}
