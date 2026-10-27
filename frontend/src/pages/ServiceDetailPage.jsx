import { Navigate, useParams } from "react-router-dom";

// The separate "shipping option" page was removed: options are now chosen on the booking form.
export default function ServiceDetailPage() {
  const { slug } = useParams();
  return <Navigate to={`/services/${slug}/book`} replace />;
}