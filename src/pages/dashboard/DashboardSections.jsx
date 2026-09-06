import {
  ArrowRight,
  CalendarDays,
  IndianRupee,
  Plus,
  ReceiptText,
  Truck,
} from "lucide-react";

import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";

import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { calculatePartySummary } from "../../utils/calculations";
import { getTripType } from "../../utils/trip";

export function QuickActions({
  onAddTrip,
  onAddPayment,
}) {
  return (
    <Card className="dashboard-card dashboard-quick-actions">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-eyebrow">
            QUICK ACTIONS
          </span>

          <h3>Common Tasks</h3>
        </div>
      </div>

      <div className="dashboard-action-list">
        <Button
          variant="primary"
          fullWidth
          icon={<Plus size={17} />}
          onClick={onAddTrip}
        >
          Add New Trip
        </Button>

        <Button
          variant="secondary"
          fullWidth
          icon={<IndianRupee size={17} />}
          onClick={onAddPayment}
        >
          Record Payment
        </Button>
      </div>
    </Card>
  );
}

export function RecentTrips({
  trips = [],
  onViewAll,
}) {
  const recentTrips = Array.isArray(trips)
    ? [...trips]
        .sort(
          (a, b) =>
            new Date(
              b?.createdAt ||
                b?.date ||
                0,
            ) -
            new Date(
              a?.createdAt ||
                a?.date ||
                0,
            ),
        )
        .slice(0, 5)
    : [];

  return (
    <Card className="dashboard-card dashboard-recent-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-eyebrow">
            RECENT WORK
          </span>

          <h3>Recent Trips</h3>
        </div>

        <button
          type="button"
          className="dashboard-view-all"
          onClick={onViewAll}
        >
          View all
          <ArrowRight size={15} />
        </button>
      </div>

      {recentTrips.length === 0 ? (
        <div className="dashboard-empty-state">
          <Truck size={22} />

          <div>
            <strong>
              No trips recorded yet
            </strong>

            <span>
              Your latest transport work will
              appear here.
            </span>
          </div>
        </div>
      ) : (
        <div className="dashboard-list">
          {recentTrips.map(
            (trip, index) => {
              const tripType =
                getTripType(trip);

              return (
                <div
                  key={
                    trip?.id ||
                    `${trip?.date}-${index}`
                  }
                  className="dashboard-list-item"
                >
                  <div className="dashboard-list-icon">
                    <Truck size={17} />
                  </div>

                  <div className="dashboard-list-content">
                    <strong>
                      {trip?.partyName ||
                        "Unassigned Party"}
                    </strong>

                    <span>
                      {trip?.materialName ||
                        trip?.material ||
                        "Material not specified"}
                    </span>
                  </div>

                  <div className="dashboard-list-meta">
                    <StatusBadge
                      status={tripType}
                      label={
                        tripType || "Unknown"
                      }
                      size="small"
                    />

                    <span>
                      {formatDate(trip?.date)}
                    </span>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </Card>
  );
}

export function RecentPayments({
  payments = [],
  onViewAll,
}) {
  const recentPayments = Array.isArray(
    payments,
  )
    ? [...payments]
        .sort(
          (a, b) =>
            new Date(
              b?.createdAt ||
                b?.date ||
                0,
            ) -
            new Date(
              a?.createdAt ||
                a?.date ||
                0,
            ),
        )
        .slice(0, 5)
    : [];

  return (
    <Card className="dashboard-card dashboard-recent-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-eyebrow">
            COLLECTIONS
          </span>

          <h3>Recent Payments</h3>
        </div>

        <button
          type="button"
          className="dashboard-view-all"
          onClick={onViewAll}
        >
          View all
          <ArrowRight size={15} />
        </button>
      </div>

      {recentPayments.length === 0 ? (
        <div className="dashboard-empty-state">
          <ReceiptText size={22} />

          <div>
            <strong>
              No payments recorded yet
            </strong>

            <span>
              Recent collections will appear
              here.
            </span>
          </div>
        </div>
      ) : (
        <div className="dashboard-list">
          {recentPayments.map(
            (payment, index) => (
              <div
                key={
                  payment?.id ||
                  `${payment?.date}-${index}`
                }
                className="dashboard-list-item"
              >
                <div className="dashboard-list-icon">
                  <IndianRupee size={17} />
                </div>

                <div className="dashboard-list-content">
                  <strong>
                    {payment?.partyName ||
                      "Unknown Party"}
                  </strong>

                  <span>
                    {payment?.paymentMode ||
                      "Payment"}

                    {payment?.referenceNo
                      ? ` • ${payment.referenceNo}`
                      : ""}
                  </span>
                </div>

                <div className="dashboard-list-meta">
                  <strong className="dashboard-payment-amount">
                    {formatCurrency(
                      payment?.amount,
                      "INR",
                      0,
                    )}
                  </strong>

                  <span>
                    {formatDate(
                      payment?.date,
                    )}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}

export function OutstandingParties({
  parties = [],
  trips = [],
  payments = [],
}) {
  const outstandingParties =
    Array.isArray(parties)
      ? parties
          .map((party) =>
            calculatePartySummary(
              party?.partyName ||
                party?.name ||
                "",
              trips,
              payments,
            ),
          )
          .filter(
            (party) =>
              Number(
                party?.outstanding || 0,
              ) > 0,
          )
          .sort(
            (a, b) =>
              Number(
                b?.outstanding || 0,
              ) -
              Number(
                a?.outstanding || 0,
              ),
          )
          .slice(0, 5)
      : [];

  return (
    <Card className="dashboard-card dashboard-outstanding-card">
      <div className="dashboard-card-header">
        <div>
          <span className="dashboard-card-eyebrow">
            RECEIVABLES
          </span>

          <h3>Outstanding Parties</h3>
        </div>
      </div>

      {outstandingParties.length === 0 ? (
        <div className="dashboard-empty-state">
          <CalendarDays size={22} />

          <div>
            <strong>
              No outstanding dues
            </strong>

            <span>
              All party balances are currently
              clear.
            </span>
          </div>
        </div>
      ) : (
        <div className="dashboard-outstanding-list">
          {outstandingParties.map(
            (party) => (
              <div
                key={party.partyName}
                className="dashboard-outstanding-item"
              >
                <div>
                  <strong>
                    {party.partyName}
                  </strong>

                  <span>
                    {party.tripCount}{" "}
                    {party.tripCount === 1
                      ? "trip"
                      : "trips"}
                  </span>
                </div>

                <strong className="dashboard-due-amount">
                  {formatCurrency(
                    party.outstanding,
                    "INR",
                    0,
                  )}
                </strong>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}