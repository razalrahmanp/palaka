"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface WorkflowHeaderProps {
  currentStep: string;
  steps: WorkflowStep[];
}

export function WorkflowHeader({ currentStep, steps }: WorkflowHeaderProps) {
  const currentIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="mb-8">
      {/* Desktop Progress Bar */}
      <div className="hidden md:block">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                const isNext = index === currentIndex + 1;
                
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                        ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : 
                          isCompleted ? 'bg-green-500 text-white' : 
                          isNext ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' :
                          'bg-gray-200 text-gray-600'}
                      `}>
                        {isCompleted ? '✓' : step.icon}
                      </div>
                      <div className="ml-4">
                        <h3 className={`font-semibold text-sm ${
                          isActive ? 'text-blue-600' : 
                          isCompleted ? 'text-green-600' : 
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </h3>
                        <p className="text-xs text-gray-500 max-w-24">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                        index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Progress */}
      <div className="md:hidden">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  {steps[currentIndex]?.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-blue-600">{steps[currentIndex]?.label}</h3>
                  <p className="text-xs text-gray-500">{steps[currentIndex]?.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-600">
                  {currentIndex + 1} of {steps.length}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`bg-blue-600 h-2 rounded-full transition-all duration-300`}
                style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
