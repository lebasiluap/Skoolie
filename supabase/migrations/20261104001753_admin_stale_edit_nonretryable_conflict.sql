-- Stale forms are HTTP conflicts, not retryable database serialization errors.
do $fix$
declare definition text;
begin
 definition:=pg_get_functiondef('public.admin_edit_question(uuid,text,text,text)'::regprocedure);
 if position('errcode=''40001''' in definition)=0 then
   raise exception 'Expected stale-edit branch missing';
 end if;
 execute replace(definition,'errcode=''40001''','errcode=''PT409''');
end $fix$;
