'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserCheck, UserX, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Mock StatCard component for demonstration
const StatCard = ({ title, value, icon: Icon, description, href }) => (
    <Link href={href} className="block hover:bg-gray-50 transition-colors">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    </Link>
);


// API fetching function
const fetchHrSummary = async () => {
    // In a real app, you would have a dedicated endpoint for this summary
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Failed to fetch HR summary data');
    const employees = await res.json();
    // Mocking other stats for now
    return {
        totalEmployees: employees.length,
        activeReviews: 5,
        newHires: 2,
    };
};

export default function HRHomePage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['hrSummary'],
        queryFn: fetchHrSummary,
    });

    if (isLoading) return <p className="p-4">Loading HR Dashboard...</p>;
    if (isError) return <p className="p-4 text-red-500">Error loading data.</p>;

    const stats = [
        { title: "Total Employees", value: data?.totalEmployees || 0, icon: Users, description: "All active and past employees", href: "/hr/employees" },
        { title: "Performance Reviews", value: data?.activeReviews || 0, icon: Star, description: "Active review cycles", href: "/hr/performance" },
        { title: "New Hires (Last 30d)", value: data?.newHires || 0, icon: UserCheck, description: "Recently onboarded", href: "/hr/employees?filter=new" },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">HR Manager Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your human resources operations.</p>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.map(stat => <StatCard key={stat.title} {...stat} />)}
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Navigate to key HR modules.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Link href="/hr/employees" className="text-primary underline font-semibold hover:text-primary/80">
                        Manage Employees
                    </Link>
                    <Link href="/hr/performance" className="text-primary underline font-semibold hover:text-primary/80">
                        Performance Reviews
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
