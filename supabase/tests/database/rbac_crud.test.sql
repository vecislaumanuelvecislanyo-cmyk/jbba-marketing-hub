begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('public','user_roles','user_roles existe');
select has_table('public','role_permissions','role_permissions existe');
select has_column('public','leads','notes','leads suporta notas livres');
select has_column('public','activities','status','activities suporta estado de workflow');
select has_column('public','targets','status','targets suporta estado de workflow');
select has_function('public','has_permission',ARRAY['uuid','text'],'has_permission existe');
select policies_are('public','leads',ARRAY['read scoped','insert scoped','update scoped','delete managers']);
select policies_are('public','followups',ARRAY['read scoped','insert scoped','update scoped','delete managers']);
select policies_are('public','employees',ARRAY['employees read','employees insert','employees update','employees delete']);
select policies_are('public','user_roles',ARRAY['own or managers read roles','admin insert roles','admin update roles','admin delete roles']);
select policies_are('public','role_permissions',ARRAY['Autenticados leem permissões','Admin gere permissões','Super admin gere perfis']);
select function_returns('public','has_permission',ARRAY['uuid','text'],'boolean','has_permission devolve boolean');
select function_returns('public','has_role',ARRAY['uuid','public.app_role'],'boolean','has_role devolve boolean');
select function_returns('public','is_manager',ARRAY['uuid'],'boolean','is_manager devolve boolean');

select * from finish();
rollback;