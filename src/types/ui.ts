// UI Component Types for the shadcn/ui components
import React from 'react';

// Button component prop types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

// Input component prop types - overriding the size property
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: string;
  size?: 'default' | 'sm' | 'lg';
}

// Form component prop types
export interface FormFieldProps {
  name: string;
  control?: unknown;
  children?: React.ReactNode;
}

export interface FormItemProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormLabelProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormControlProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormDescriptionProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormMessageProps {
  className?: string;
  children?: React.ReactNode;
}

// Select component prop types
export interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface SelectContentProps {
  className?: string;
  position?: 'popper' | 'item-aligned';
  children?: React.ReactNode;
}

export interface SelectItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}
