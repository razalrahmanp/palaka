// src/types/ui.d.ts
// This file adds type declarations for UI components

declare module '@/components/ui/form' {
  import { ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';
  
  export interface FormFieldProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  > {
    control: any;
    name: TName;
    render: (props: { field: ControllerRenderProps<TFieldValues, TName> }) => React.ReactNode;
  }
  
  export const Form: React.FC<any>;
  export const FormControl: React.FC<any>;
  export const FormField: React.FC<FormFieldProps>;
  export const FormItem: React.FC<any>;
  export const FormLabel: React.FC<any>;
  export const FormMessage: React.FC<any>;
}

declare module '@/components/ui/input' {
  export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>>;
}

declare module '@/components/ui/button' {
  export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/textarea' {
  export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>>;
}

declare module '@/components/ui/select' {
  export const Select: React.FC<any>;
  export const SelectContent: React.FC<any>;
  export const SelectItem: React.FC<any>;
  export const SelectTrigger: React.FC<any>;
  export const SelectValue: React.FC<any>;
}
