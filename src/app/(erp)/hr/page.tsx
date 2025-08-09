'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Star, Calendar, BookOpen, DollarSign, FileText, Settings, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hasPermission } from '@/lib/auth';

// API fetching function
const fetchHrSummary = async () => {
    try {
        const res = await fetch('/api/hr/dashboard');
        if (!res.ok) {
            // Fallback to basic employee count if dashboard API doesn't exist
            const empRes = await fetch('/api/employees');
            if (empRes.ok) {
                const employees = await empRes.json();
                return {
                    totalEmployees: employees.length,
                    activeReviews: 0,
                    newHires: 0,
                    pendingLeaves: 0,
                    todayAttendance: 0
                };
            }
            throw new Error('Failed to fetch HR summary data');
        }
        return res.json();
    } catch {
        // Mock data for initial implementation
        return {
            totalEmployees: 25,
            activeReviews: 5,
            newHires: 2,
            pendingLeaves: 3,
            todayAttendance: 18
        };
    }
};

const hrModules = [
    {
        title: 'Employees',
        description: 'Manage employee profiles, personal information, and employment details',
        icon: Users,
        href: '/hr/employees',
        permission: 'employee:manage',
        color: 'bg-blue-500'
    },
    {
        title: 'Attendance',
        description: 'Track daily attendance, check-ins, check-outs, and working hours',
        icon: Clock,
        href: '/hr/attendance',
        permission: 'employee:manage',
        color: 'bg-green-500'
    },
    {
        title: 'Leave Management',
        description: 'Handle leave requests, approvals, and balance tracking',
        icon: Calendar,
        href: '/hr/leave',
        permission: 'employee:manage',
        color: 'bg-yellow-500'
    },
    {
        title: 'Performance',
        description: 'Manage performance reviews, goals, and employee evaluations',
        icon: Star,
        href: '/hr/performance',
        permission: 'performance_review:read',
        color: 'bg-purple-500'
    },
    {
        title: 'Training',
        description: 'Organize training programs, courses, and skill development',
        icon: BookOpen,
        href: '/hr/training',
        permission: 'employee:manage',
        color: 'bg-indigo-500'
    },
    {
        title: 'Payroll',
        description: 'Process payroll, manage salary structures, and compensation',
        icon: DollarSign,
        href: '/hr/payroll',
        permission: 'salary:manage',
        color: 'bg-emerald-500'
    },
    {
        title: 'Documents',
        description: 'Manage employee documents, policies, and compliance',
        icon: FileText,
        href: '/hr/documents',
        permission: 'employee:manage',
        color: 'bg-orange-500'
    },
    {
        title: 'HR Settings',
        description: 'Configure HR policies, leave types, and system settings',
        icon: Settings,
        href: '/hr/settings',
        permission: 'employee:manage',
        color: 'bg-gray-500'
    }
];

export default function HRHomePage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['hrSummary'],
        queryFn: fetchHrSummary,
    });

    if (isLoading) return <p className="p-4">Loading HR Dashboard...</p>;
    if (isError) return <p className="p-4 text-red-500">Error loading data.</p>;

    const stats = [
        { title: "Total Employees", value: data?.totalEmployees || 0, icon: Users, description: "All active employees", href: "/hr/employees" },
        { title: "Today's Attendance", value: data?.todayAttendance || 0, icon: Clock, description: "Checked in today", href: "/hr/attendance" },
        { title: "Pending Leaves", value: data?.pendingLeaves || 0, icon: Calendar, description: "Awaiting approval", href: "/hr/leave" },
        { title: "Active Reviews", value: data?.activeReviews || 0, icon: Star, description: "In progress", href: "/hr/performance" },
        { title: "New Hires (30d)", value: data?.newHires || 0, icon: UserCheck, description: "Recently onboarded", href: "/hr/employees?filter=new" },
    ];

    const availableModules = hrModules.filter(module => 
        hasPermission(module.permission)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-8">
            {/* Header Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                            Human Resources
                        </h1>
                        <p className="text-gray-600 mt-2">Manage employees, attendance, performance, and HR operations</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">HR Management</span>
                    </div>
                </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => {
                    const IconComponent = stat.icon;
                    return (
                        <Link key={stat.title} href={stat.href} className="block group">
                            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                                                <IconComponent className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                    <p className="text-xs text-gray-500">{stat.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* HR Modules Grid */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">HR Modules</h2>
                    <p className="text-gray-600">Access all human resources management functions</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {availableModules.map((module) => {
                        const IconComponent = module.icon;
                        
                        return (
                            <Link key={module.href} href={module.href} className="block group">
                                <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg group-hover:scale-105 border-0 shadow-md h-full bg-white/60 backdrop-blur-sm">
                                    <CardHeader className="pb-3">
                                        <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                                            <IconComponent className="h-6 w-6 text-white" />
                                        </div>
                                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                                            {module.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {module.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {availableModules.length === 0 && (
                    <Card className="text-center py-12 bg-white/60 backdrop-blur-sm">
                        <CardContent>
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No HR Modules Available</h3>
                            <p className="text-gray-600">
                                You don&apos;t have permission to access any HR modules. Contact your administrator for access.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
