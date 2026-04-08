import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { Plus, Trash2, Calendar, DollarSign, Tag, Plane, ShoppingCart, GraduationCap, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

const EVENT_ICONS: Record<string, any> = {
    travel: Plane,
    purchase: ShoppingCart,
    education: GraduationCap,
    celebration: PartyPopper,
    other: Tag
};

export function EventsTab() {
    const { inputs, updateInputs, loading } = useProjectionModel();

    if (loading || !inputs) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading events...</div>;
    }

    const events = (inputs.events as any[]) || [];

    const addEvent = () => {
        const next = [...events, { id: crypto.randomUUID(), name: "New Event", year: 2026, amount: 50000, type: 'other' }];
        updateInputs({ events: next });
    };

    const updateEvent = (id: string, updates: any) => {
        const next = events.map((ev: any) => ev.id === id ? { ...ev, ...updates } : ev);
        updateInputs({ events: next });
    };

    const removeEvent = (id: string) => {
        const next = events.filter((ev: any) => ev.id !== id);
        updateInputs({ events: next });
    };

    return (
        <div className="space-y-10 max-w-4xl animate-fade-in-up">

            {/* Header / Add Button */}
            <div className="flex items-center justify-between pb-2 border-b border-brand-border/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text1">
                        One-Off Life Events
                    </h3>
                </div>
                <Button onClick={addEvent} size="sm" variant="secondary" className="h-8 gap-2 border-brand-accent/20 hover:bg-brand-accent/5 text-brand-accent">
                    <Plus className="w-3 h-3" /> Add Event
                </Button>
            </div>

            <p className="text-sm text-brand-text2 leading-relaxed max-w-2xl">
                Define major one-time expenses or windfalls (e.g. weddings, big travels, car purchases) to see their impact on your long-term wealth.
            </p>

            <div className="grid grid-cols-1 gap-4">
                {events.length === 0 && (
                    <div className="p-12 border border-dashed border-brand-border rounded-3xl text-center bg-brand-surface2/30">
                        <PartyPopper className="w-10 h-10 text-brand-text3 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium text-brand-text3">No major life events planned yet.</p>
                        <p className="text-xs text-brand-text3 mt-1 opacity-70">Click "Add Event" to start planning.</p>
                    </div>
                )}

                {events.map((ev: any) => {
                    const Icon = EVENT_ICONS[ev.type || 'other'] || Tag;
                    return (
                        <div key={ev.id || Math.random()} className="group grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-6 p-5 bg-brand-surface2/50 rounded-2xl border border-brand-border hover:border-brand-accent/20 transition-all hover:shadow-soft">
                            <div className={`p-3 rounded-xl ${ev.amount > 0 ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-accent/10 text-brand-accent"}`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-brand-text3 tracking-tighter">Event Name</label>
                                <input
                                    type="text"
                                    value={ev.name}
                                    onChange={e => updateEvent(ev.id, { name: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none text-brand-text1"
                                    placeholder="e.g. World Trip"
                                />
                            </div>

                            <div className="w-24">
                                <label className="text-[10px] uppercase font-bold text-brand-text3 tracking-tighter">Year</label>
                                <input
                                    type="number"
                                    value={ev.year}
                                    onChange={e => updateEvent(ev.id, { year: Number(e.target.value) })}
                                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0 tabular-nums outline-none text-brand-text1"
                                />
                            </div>

                            <div className="w-32">
                                <label className="text-[10px] uppercase font-bold text-brand-text3 tracking-tighter">Amount (DKK)</label>
                                <input
                                    type="number"
                                    value={ev.amount || ev.cost || 0}
                                    onChange={e => updateEvent(ev.id, { amount: Number(e.target.value) })}
                                    className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0 tabular-nums outline-none text-brand-text1"
                                />
                            </div>

                            <button
                                onClick={() => removeEvent(ev.id)}
                                className="p-2 text-brand-text3 hover:text-brand-danger transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="bg-brand-surface/50 p-6 rounded-2xl border border-brand-border/50 text-xs text-brand-text3 flex gap-4">
                <Tag className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed italic">
                    Note: Positive amounts represent expenses. Negative amounts represent windfalls or one-off income.
                </p>
            </div>

        </div>
    );
}
