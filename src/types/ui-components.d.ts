// This file provides type definitions for UI component props
import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

declare module 'react' {
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }

  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    variant?: string;
    size?: 'default' | 'sm' | 'lg';
  }

  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    variant?: string;
    size?: 'default' | 'sm' | 'lg';
  }
}

// Types for ui/form components
export interface FormFieldProps {
  name: string;
  control?: any;
}

export interface FormItemProps {
  className?: string;
}

export interface FormLabelProps {
  className?: string;
}

export interface FormControlProps {
  className?: string;
}

export interface FormDescriptionProps {
  className?: string;
}

export interface FormMessageProps {
  className?: string;
}

// For Select component
export interface SelectTriggerProps {
  className?: string;
}

export interface SelectValueProps {
  className?: string;
  placeholder?: string;
}

export interface SelectContentProps {
  className?: string;
  position?: 'popper' | 'item-aligned';
}

export interface SelectItemProps {
  value: string;
  className?: string;
}

// For furniture category related components
export interface Material {
  id: string;
  name: string;
}

export interface SubCategory {
  id: string;
  name: string;
  materials?: Material[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: SubCategory[];
}

export interface FurnitureCategory {
  [key: string]: Category[];
}
