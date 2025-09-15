import ProtectedRoute from "../components/ProtectedRoute";

export default function TodoPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Your Todo App</h1>
        <p>Welcome! You are logged in.</p>
      </div>
    </ProtectedRoute>
  );
}
