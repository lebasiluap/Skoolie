-- Pure provider-name mapping; pin pg_catalog resolution without changing ACL.
alter function question_audit.reviewer_provider(text) set search_path='';
