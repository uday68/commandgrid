import requests

def test_ai_backend():
    try:
        response = requests.get('http://localhost:5000/api/test/hello')
        print("Response Status:", response.status_code)
        print("Response Body:", response.json())
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the AI backend. Make sure it's running on port 5000.")
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test_ai_backend() 