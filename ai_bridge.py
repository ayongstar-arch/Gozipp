import json
import urllib.request
import sys
import os

OLLAMA_URL = "http://localhost:11434/api/generate"
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

def read_plan(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading plan file: {e}")
        sys.exit(1)

def call_ollama(model_name, prompt):
    data = {
        "model": model_name,
        "prompt": prompt,
        "stream": False
    }
    
    req = urllib.request.Request(OLLAMA_URL, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        return result.get('response', '')
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return None

def main():
    print("GOZIPP AI Bridge - Connecting to Local AI...")
    
    plan_path = r"C:\Users\acer\.gemini\antigravity\brain\a0f505cd-2364-47d2-ae01-5ba328909792\implementation_plan.md"
    plan_content = read_plan(plan_path)
    
    prompt = f"""You are an elite Developer. Your task is to execute the following implementation plan.
Refactor the HowItWorksSection.tsx to match the side-by-side grid layout described in the plan.
For step-d2 and step-d3, since the images were not generated due to quota, please fallback to using the Lucide icons <ListOrdered /> and <Bike /> inside the new design for those two steps only.
Output the code directly inside markdown code blocks.
Here is the plan:
{plan_content}
"""

    model = "qwen2.5-coder:32b" # Updated to your installed top-tier coding model
    print(f"Sending plan to Ollama (Model: {model})... Please wait.")
    
    code_result = call_ollama(model, prompt)
    
    if code_result:
        print("SUCCESS: Received code from Local AI!")
        print("-" * 50)
        print(code_result[:500] + "...\n[Output truncated for brevity]")
        print("-" * 50)
        print("In a fully automated setup, this script would now automatically create the .tsx files.")
    else:
        print("ERROR: Failed to get a response from Local AI. Make sure Ollama is running.")

if __name__ == "__main__":
    main()
