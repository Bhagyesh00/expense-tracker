import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '../lib/cn';

export interface CardProps extends ViewProps {
  className?: string;
}

const Card = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          'rounded-xl border border-secondary-200 bg-white shadow-card',
          className,
        )}
        {...props}
      >
        {children}
      </View>
    );
  },
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('px-4 pt-4 pb-2', className)}
        {...props}
      >
        {children}
      </View>
    );
  },
);

CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('px-4 py-2', className)}
        {...props}
      >
        {children}
      </View>
    );
  },
);

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<View, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          'flex-row items-center px-4 pt-2 pb-4',
          className,
        )}
        {...props}
      >
        {children}
      </View>
    );
  },
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
