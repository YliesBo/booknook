// components/layout/Container.tsx
import React, { ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  fullWidth?: boolean;
};

export default function Container({ 
  children, 
  className = '', 
  noPadding = false,
  fullWidth = false
}: ContainerProps) {
  return (
    <div className={`
      ${fullWidth ? 'w-full' : 'max-w-8xl mx=16px'} 
      ${noPadding ? '' : 'py-4 md:py-6 px-3'} 
      ${className}
    `}>
      {children}
    </div>
  );
}