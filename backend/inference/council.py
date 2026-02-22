"""
Model Council - Multiple LLMs deliberate, one LLM judges.

Usage:
    from inference.council import ModelCouncil
    council = ModelCouncil(providers=["crusoe", "deepseek", "grok"], judge="openai")
    result = council.deliberate("What happened with X?")
    print(result["judgment"])
"""
from __future__ import annotations
import json
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from inference.base import CompletionResponse
from inference.factory import get_provider

logger = logging.getLogger("factnews.council")


JUDGE_SYSTEM_PROMPT = """You are an impartial judge evaluating responses from multiple AI models.

Your task:
1. Read all model responses carefully
2. Identify points of AGREEMENT across models (high confidence facts)
3. Identify points of DISAGREEMENT or unique claims (lower confidence)
4. Synthesize the BEST possible answer by combining the strongest elements
5. Flag any hallucinations or unsupported claims

Respond in JSON:
{
  "synthesis": "Your synthesized best answer combining the strongest elements",
  "agreement_points": ["fact that 2+ models agree on", ...],
  "disagreement_points": ["claim where models differ", ...],
  "model_rankings": [
    {"provider": "name", "score": 0.0-1.0, "reasoning": "brief justification"}
  ],
  "confidence": 0.0-1.0,
  "flagged_issues": ["any hallucinations or concerns", ...]
}"""


class ModelCouncil:
    """
    Sends a prompt to N providers in parallel, then uses a judge LLM
    to evaluate and synthesize the best response.
    """

    def __init__(
        self,
        providers: list[str],
        judge: str = "openai",
        max_workers: int = 5,
    ):
        self.provider_names = providers
        self.judge_name = judge
        self.max_workers = max_workers

    def _query_provider(self, provider_name: str, messages: list[dict], **kwargs) -> tuple[str, CompletionResponse | str]:
        """Query a single provider, returning (name, response_or_error)."""
        try:
            provider = get_provider(provider_name)
            response = provider.complete(messages, **kwargs)
            return provider_name, response
        except Exception as e:
            return provider_name, f"ERROR: {e}"

    async def _query_provider_async(self, provider_name: str, messages: list[dict], **kwargs) -> tuple[str, CompletionResponse | str]:
        """Query a single provider asynchronously, returning (name, response_or_error)."""
        try:
            provider = get_provider(provider_name)
            response = await provider.complete_async(messages, **kwargs)
            logger.info(f"🔄 {provider_name} responded ({len(response.content)} chars)")
            return provider_name, response
        except Exception as e:
            logger.error(f"❌ {provider_name} failed: {e}")
            return provider_name, f"ERROR: {e}"

    def deliberate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.7,
        judge_temperature: float = 0.2,
        judge_system_prompt: str | None = None,
    ) -> dict:
        """
        Send prompt to all council providers, then have the judge evaluate.

        Returns:
            {
                "responses": {provider_name: content_or_error, ...},
                "judgment": parsed judge response (dict),
                "raw_judgment": raw judge text,
                "providers_used": [names that succeeded],
                "providers_failed": [names that failed],
            }
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        # -- Phase 1: query all providers in parallel -----------------------
        responses: dict[str, str] = {}
        succeeded: list[str] = []
        failed: list[str] = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            futures = {
                pool.submit(self._query_provider, name, messages, temperature=temperature): name
                for name in self.provider_names
            }
            for future in as_completed(futures):
                name, result = future.result()
                if isinstance(result, CompletionResponse):
                    responses[name] = result.content
                    succeeded.append(name)
                else:
                    responses[name] = result  # error string
                    failed.append(name)

        if not succeeded:
            return {
                "responses": responses,
                "judgment": {"error": "All providers failed"},
                "raw_judgment": "",
                "providers_used": succeeded,
                "providers_failed": failed,
            }

        # -- Phase 2: build judge prompt ------------------------------------
        council_text = "\n\n".join(
            f"=== MODEL: {name} ===\n{responses[name]}"
            for name in succeeded
        )

        judge_prompt = f"""The user asked: "{prompt}"

{len(succeeded)} models provided responses. Evaluate them and synthesize the best answer.

{council_text}"""

        # -- Phase 3: judge evaluates ---------------------------------------
        judge = get_provider(self.judge_name)
        active_judge_prompt = judge_system_prompt or JUDGE_SYSTEM_PROMPT
        judge_response = judge.complete(
            [
                {"role": "system", "content": active_judge_prompt},
                {"role": "user", "content": judge_prompt},
            ],
            temperature=judge_temperature,
            json_mode=True,
        )

        clean_content = judge_response.content.strip()
        if clean_content.startswith("```"):
            lines = clean_content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean_content = "\n".join(lines).strip()

        try:
            judgment = json.loads(clean_content)
        except json.JSONDecodeError:
            judgment = {"synthesis": clean_content, "parse_error": True}

        return {
            "responses": responses,
            "judgment": judgment,
            "raw_judgment": judge_response.content,
            "providers_used": succeeded,
            "providers_failed": failed,
        }

    async def deliberate_async(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.7,
        judge_temperature: float = 0.2,
        judge_system_prompt: str | None = None,
    ) -> dict:
        """
        Async version: Send prompt to all council providers in parallel, then have the judge evaluate.

        Returns:
            {
                "responses": {provider_name: content_or_error, ...},
                "judgment": parsed judge response (dict),
                "raw_judgment": raw judge text,
                "providers_used": [names that succeeded],
                "providers_failed": [names that failed],
            }
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        logger.info(f"🏛️ Council deliberating with {len(self.provider_names)} providers...")

        tasks = [
            self._query_provider_async(name, messages, temperature=temperature)
            for name in self.provider_names
        ]
        results = await asyncio.gather(*tasks)

        responses: dict[str, str] = {}
        succeeded: list[str] = []
        failed: list[str] = []

        for name, result in results:
            if isinstance(result, CompletionResponse):
                responses[name] = result.content
                succeeded.append(name)
                logger.info(f"✅ {name}: {len(result.content)} chars")
            else:
                responses[name] = result
                failed.append(name)

        if not succeeded:
            return {
                "responses": responses,
                "judgment": {"error": "All providers failed"},
                "raw_judgment": "",
                "providers_used": succeeded,
                "providers_failed": failed,
            }

        council_text = "\n\n".join(
            f"=== MODEL: {name} ===\n{responses[name]}"
            for name in succeeded
        )

        judge_prompt = f"""The user asked: "{prompt}"

{len(succeeded)} models provided responses. Evaluate them and synthesize the best answer.

{council_text}"""

        logger.info(f"⚖️ Judge ({self.judge_name}) evaluating {len(succeeded)} responses...")
        judge = get_provider(self.judge_name)
        active_judge_prompt = judge_system_prompt or JUDGE_SYSTEM_PROMPT
        judge_response = await judge.complete_async(
            [
                {"role": "system", "content": active_judge_prompt},
                {"role": "user", "content": judge_prompt},
            ],
            temperature=judge_temperature,
            json_mode=True,
        )

        clean_content = judge_response.content.strip()
        if clean_content.startswith("```"):
            lines = clean_content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            clean_content = "\n".join(lines).strip()

        try:
            judgment = json.loads(clean_content)
        except json.JSONDecodeError:
            judgment = {"synthesis": clean_content, "parse_error": True}

        logger.info(f"✅ Council complete: {len(succeeded)} providers succeeded, {len(failed)} failed")
        return {
            "responses": responses,
            "judgment": judgment,
            "raw_judgment": judge_response.content,
            "providers_used": succeeded,
            "providers_failed": failed,
        }
