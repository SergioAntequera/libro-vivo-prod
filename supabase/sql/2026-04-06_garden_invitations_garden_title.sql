-- Permite que quien envia una invitacion proponga el nombre del jardin
-- que se creara cuando la otra persona acepte.

alter table if exists public.garden_invitations
  add column if not exists garden_title text null;

comment on column public.garden_invitations.garden_title is
  'Nombre propuesto para el jardin que se creara al aceptar la invitacion.';
