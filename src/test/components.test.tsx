import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EventForm } from "@/components/event/EventForm";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { TaskChecklist, type TaskView } from "@/components/timeline/TaskChecklist";
import { VendorManager, VendorForm } from "@/components/vendors/VendorManager";
import { EmptyState } from "@/components/common/ConfirmButton";

vi.mock("recharts", async () => {
  const React = await import("react");
  const Box = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  return { ResponsiveContainer: Box, PieChart: Box, Pie: Box, Cell: Box, Tooltip: Box, Legend: Box };
});

describe("EventForm", () => {
  it("shows accessible inline errors and blocks the next step", async () => {
    render(<EventForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const title = await screen.findByLabelText(/event title/i);
    await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
    expect(title.getAttribute("aria-describedby")).toBe("title-error");
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/name/i), expect.stringMatching(/date/i)]),
    );
  });

  it("submits valid values in single-page mode", async () => {
    const onSubmit = vi.fn();
    render(
      <EventForm wizard={false} submitLabel="Save" initial={{ title: "Party", event_date: "2026-08-01", location: "Pune", guest_count: 30, total_budget: 2000 }} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ title: "Party", guest_count: 30, total_budget: 2000 });
  });

  it("rejects a negative budget", async () => {
    const onSubmit = vi.fn();
    render(<EventForm wizard={false} initial={{ title: "Party", event_date: "2026-08-01", location: "Pune", total_budget: -5 }} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /create event/i }));
    expect(await screen.findByText(/can't be negative/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("BudgetEditor", () => {
  const base = { total: 1000, currency: "USD", contingencyPct: 10, onAddLine: vi.fn(), onDeleteLine: vi.fn(), onChangeTotal: vi.fn(), onChangeContingency: vi.fn() };

  it("shows totals and commits edited expenses on blur", () => {
    const onChangeLine = vi.fn();
    render(<BudgetEditor {...base} onChangeLine={onChangeLine} lines={[{ id: "1", name: "Venue", allocated: 600, spent: 100 }]} />);
    expect(screen.getByTestId("stat-remaining")).toHaveTextContent("$900");
    const spent = screen.getByLabelText("Venue spent");
    fireEvent.change(spent, { target: { value: "250" } });
    fireEvent.blur(spent);
    expect(onChangeLine).toHaveBeenCalledWith("1", { spent: 250 });
  });

  it("warns when spending exceeds allocation and ignores invalid input", () => {
    const onChangeLine = vi.fn();
    render(<BudgetEditor {...base} onChangeLine={onChangeLine} lines={[{ id: "1", name: "Catering", allocated: 200, spent: 300 }]} />);
    expect(screen.getByText(/budget warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Over \$100/)).toBeInTheDocument();
    const alloc = screen.getByLabelText("Catering allocated");
    fireEvent.change(alloc, { target: { value: "-4" } });
    expect(screen.getByText(/enter 0 or more/i)).toBeInTheDocument();
    fireEvent.blur(alloc);
    expect(onChangeLine).not.toHaveBeenCalled();
  });

  it("shows an empty state with no categories", () => {
    render(<BudgetEditor {...base} onChangeLine={vi.fn()} lines={[]} />);
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });
});

describe("TaskChecklist", () => {
  const tasks: TaskView[] = [
    { id: "a", title: "Book venue", phase: "venue", due_date: "2026-05-01", priority: "high", status: "todo", position: 0 },
    { id: "b", title: "Send invites", phase: "guests", due_date: "2026-07-01", priority: "medium", status: "done", position: 1 },
  ];
  const handlers = () => ({ onAdd: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() });

  it("marks overdue tasks with text, not only color", () => {
    render(<TaskChecklist tasks={tasks} today="2026-06-01" eventDate="2026-08-01" {...handlers()} />);
    expect(within(screen.getByRole("list", { name: "Tasks" })).getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 complete/)).toBeInTheDocument();
  });

  it("completes a task via its checkbox", () => {
    const h = handlers();
    render(<TaskChecklist tasks={tasks} today="2026-06-01" eventDate="2026-08-01" {...h} />);
    fireEvent.click(screen.getByLabelText('Mark "Book venue" done'));
    expect(h.onUpdate).toHaveBeenCalledWith("a", { status: "done" });
  });

  it("validates and adds a task", () => {
    const h = handlers();
    render(<TaskChecklist tasks={tasks} today="2026-06-01" eventDate="2026-08-01" {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
    fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Order cake" } });
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));
    expect(h.onAdd).toHaveBeenCalledWith(expect.objectContaining({ title: "Order cake", due_date: null }));
  });

  it("filters to done tasks", () => {
    render(<TaskChecklist tasks={tasks} today="2026-06-01" eventDate="2026-08-01" {...handlers()} />);
    fireEvent.click(screen.getByRole("button", { name: "Done", pressed: false }));
    const list = screen.getByRole("list", { name: "Tasks" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("Send invites")).toBeInTheDocument();
  });
});

describe("Vendor management", () => {
  const vendors = [
    { id: "1", name: "Sample Hall", category: "venue", contact: "", estimated_cost: 900, booking_status: "booked", payment_status: "deposit", rating: 4, notes: "", is_sample: true },
    { id: "2", name: "My Caterer", category: "catering", contact: "", estimated_cost: 500, booking_status: "shortlisted", payment_status: "unpaid", rating: null, notes: "", is_sample: false },
  ];
  it("labels sample vendors and updates booking status", () => {
    const onUpdate = vi.fn();
    render(<VendorManager vendors={vendors} currency="USD" onAdd={vi.fn()} onUpdate={onUpdate} onDelete={vi.fn()} />);
    expect(screen.getByText(/not a real business/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Booking", { selector: "#b-2" }), { target: { value: "booked" } });
    expect(onUpdate).toHaveBeenCalledWith("2", { booking_status: "booked" });
  });
  it("filters by category", () => {
    render(<VendorManager vendors={vendors} currency="USD" onAdd={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Category filter"), { target: { value: "catering" } });
    expect(screen.queryByText("Sample Hall")).not.toBeInTheDocument();
    expect(screen.getByText("My Caterer")).toBeInTheDocument();
  });
  it("vendor form requires a name", () => {
    const onSubmit = vi.fn();
    render(<VendorForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /save vendor/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
    fireEvent.change(screen.getByLabelText(/vendor name/i), { target: { value: "Glow Decor" } });
    fireEvent.change(screen.getByLabelText(/estimated cost/i), { target: { value: "350" } });
    fireEvent.click(screen.getByRole("button", { name: /save vendor/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Glow Decor", estimated_cost: 350 }));
  });
  it("shows an empty state", () => {
    render(<EmptyState title="No vendors yet" text="Add some" />);
    expect(screen.getByRole("heading", { name: "No vendors yet" })).toBeInTheDocument();
  });
});
