from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
cursoe = os.getenv("CRUSOE_API_KEY")

client = OpenAI(
    base_url='https://hackeurope.crusoecloud.com/v1/',
    api_key=cursoe,
)

def ask_prompt(prompt: str):
    return client.chat.completions.create(
        model='NVFP4/Qwen3-235B-A22B-Instruct-2507-FP4',
        messages=[
            {
                'role': 'user',
                'content': prompt
            }
        ],
        temperature=1,
        top_p=0.95,
        frequency_penalty=0,
        presence_penalty=0,
    )


print(ask_prompt(input("Pregunta: ")).to_dict()['choices'][0]["message"]["content"])

