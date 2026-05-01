import json
from locust import HttpUser, task, between, LoadTestShape

class ElectraUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # In a real scenario, we would exchange a Firebase custom token for an ID token
        self.client.headers.update({
            "Authorization": "Bearer TEST_ID_TOKEN",
            "Content-Type": "application/json"
        })

    @task(3)
    def chat_oracle(self):
        payload = {
            "query": "What are the latest civic updates in my area?",
            "context": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "How can I help you today?"}
            ]
        }
        with self.client.post("/api/oracle/chat", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "reply" in data:
                        response.success()
                    else:
                        response.failure("Missing 'reply' in JSON response")
                except json.JSONDecodeError:
                    response.failure("Response could not be decoded as JSON")
            elif response.status_code == 429:
                response.success() # Rate limited, expected under high load
            else:
                response.failure(f"Unexpected status code: {response.status_code}")

    @task(1)
    def fetch_civic_score(self):
        self.client.get("/api/user/score")

class StepLoadShape(LoadTestShape):
    """
    A step load shape to simulate ramp up of 1000 users over time.
    """
    step_time = 30
    step_users = 100
    spawn_rate = 10
    time_limit = 300

    def tick(self):
        run_time = self.get_run_time()
        if run_time > self.time_limit:
            return None

        current_step = math.floor(run_time / self.step_time) + 1
        return (current_step * self.step_users, self.spawn_rate)
