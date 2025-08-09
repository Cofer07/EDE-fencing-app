-- Prevent duplicate fencers (same name+club+weapon)
CREATE UNIQUE INDEX IF NOT EXISTS ux_fencers_name_club_weapon
ON fencers(name, IFNULL(club,''), IFNULL(weapon,''));
