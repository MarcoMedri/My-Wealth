import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import BrokersSidebar from './BrokersSidebar';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Left Sidebar (Navigation) */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 overflow-hidden flex flex-col relative w-full">
                {children}
            </main>

            {/* Right Sidebar (Brokers/Containers) */}
            <BrokersSidebar />
        </div>
    );
}
