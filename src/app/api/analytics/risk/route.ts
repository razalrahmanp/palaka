import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        // The 'risk_incidents' table does not exist. Using the 'alerts' table as a proxy for risk data.
        const { data: alerts, error: alertsError } = await supabaseAdmin
            .from('alerts')
            .select('type, priority');

        if (alertsError) throw new Error(`Alerts Error: ${alertsError.message}`);

        // Process the data in code to group by type
        const incidentsByType = alerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
        }, {});

        // Process the data in code to group by priority (as a proxy for severity)
        const openIncidentsBySeverity = alerts.reduce((acc, alert) => {
            acc[alert.priority] = (acc[alert.priority] || 0) + 1;
            return acc;
        }, {});

        const responseData = {
            incidentsByType: Object.entries(incidentsByType).map(([type, count]) => ({ type, count })),
            openIncidentsBySeverity: Object.entries(openIncidentsBySeverity).map(([name, value]) => ({ name, value })),
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[RISK_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}
