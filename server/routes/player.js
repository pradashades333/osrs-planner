import { Router } from 'express';
const router = Router();
import { getStatsByGamemode } from 'osrs-json-hiscores';
import { prisma } from '../db.js';


router.get('/:rsn', async (req, res) => {
    const rsn = req.params.rsn;
    const mode = req.query.mode || 'main';

    try {
        const stats = await getStatsByGamemode(rsn, mode);

        const player = await prisma.player.upsert({
            where: {rsn: rsn.toLowerCase()},
            create: {
                rsn: rsn.toLowerCase(),
                mode:mode,
                totalLevel: stats.skills.overall.level,
                totalXp: BigInt(stats.skills.overall.xp)
            },

            update: {
                mode:mode,
                totalLevel: stats.skills.overall.level,
                totalXp: BigInt(stats.skills.overall.xp)
            }

        })

        for (const [name, data] of Object.entries(stats.skills)) {
            if (name === 'overall') continue;

            await prisma.skill.upsert({
                where: { playerId_name: { playerId: player.id, name: name } },
                create: {
                    playerId: player.id,
                    name: name,
                    level: data.level,
                    xp: data.xp,
                    rank: data.rank,
                },
                update: {
                    level: data.level,
                    xp: data.xp,
                    rank: data.rank,
                },
            });
        }
        


        player.totalXp = player.totalXp.toString();


        res.json({player,stats} )

    } catch(err) {
        res.status(500).json({ error: err.message });
    }

})

export default router;